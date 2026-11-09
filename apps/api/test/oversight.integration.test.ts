import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createPostgresCheckpointer } from "@synapse/adapters/checkpointer";
import { createAuditLog } from "@synapse/audit";
import { createDatabase, runMigrations, sourceMigrationsFolder } from "@synapse/database";
import { redactPiiDeep } from "@synapse/security";
import { sql } from "drizzle-orm";

import { DrizzleAuditRepository } from "@/modules/audit";
import {
	DrizzleApprovalRepository,
	DrizzleFeedbackRepository,
	OVERSIGHT_ACTIONS,
	OversightService,
} from "@/modules/oversight";

/** Real Postgres. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;

describe.skipIf(!url)("oversight (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 3 });
	const closers: Array<() => Promise<void>> = [];
	const owner = `it-oversight-${crypto.randomUUID()}`;

	beforeAll(async () => {
		await runMigrations(database.db, sourceMigrationsFolder);
	});

	afterAll(async () => {
		await database.db.execute(
			sql`delete from approval_requests where owner_id like 'it-oversight-%'`,
		);
		await database.db.execute(
			sql`delete from answer_feedback where owner_id like 'it-oversight-%'`,
		);
		await Promise.all(closers.map((close) => close()));
		await database.close();
	});

	/** One API process: its own checkpointer connection and service, same database. */
	async function startProcess(executed: string[], name: string) {
		const checkpointer = createPostgresCheckpointer({
			connectionString: url ?? "",
			schema: "langgraph_test",
		});
		closers.push(checkpointer.close);
		await checkpointer.setup();
		const oversight = new OversightService(
			new DrizzleApprovalRepository(database.db),
			new DrizzleFeedbackRepository(database.db),
			checkpointer.saver,
			createAuditLog({ store: new DrizzleAuditRepository(database.db), redact: redactPiiDeep }),
		);
		oversight.registerAction<{ ownerId: string; requestedBy: string }, { by: string }>(
			OVERSIGHT_ACTIONS.PURGE_DOCUMENTS,
			{
				describe: async () => "Delete all 3 of your documents and their chunks",
				execute: async () => {
					executed.push(name);
					return { by: name };
				},
			},
		);
		return oversight;
	}

	test("a request made before a restart is approved after it, and the action runs once", async () => {
		const executed: string[] = [];
		const user = { sub: owner, sid: "s1", orgId: owner, role: "owner" as const };
		const before = await startProcess(executed, "before");
		const approval = await before.request(OVERSIGHT_ACTIONS.PURGE_DOCUMENTS, {
			ownerId: owner,
			requestedBy: owner,
		});
		expect(approval).toMatchObject({ ownerId: owner, status: "pending" });
		expect((await before.pending(user)).map((a) => a.id)).toEqual([approval.id]);

		const after = await startProcess(executed, "after");
		const decided = await after.decide(approval.id, user, { approved: true });
		expect(decided.approval).toMatchObject({ status: "approved", decidedBy: owner });
		expect(decided.outcome).toEqual({
			status: "done",
			approvalId: approval.id,
			result: { by: "after" },
		});

		// A retried approval (e.g. the client timed out) returns the same outcome without re-running.
		expect((await after.decide(approval.id, user, { approved: true })).outcome.status).toBe("done");
		await expect(after.decide(approval.id, user, { approved: false })).rejects.toMatchObject({
			code: "OVERSIGHT_APPROVAL_ALREADY_DECIDED",
		});
		expect(executed).toEqual(["after"]);
		expect(await after.pending(user)).toEqual([]);
	}, 30_000);

	test("feedback is one row per user and request", async () => {
		const service = await startProcess([], "feedback");
		await service.recordFeedback(owner, { requestId: "req_1", rating: "down", comment: "wrong" });
		const changed = await service.recordFeedback(owner, { requestId: "req_1", rating: "up" });
		expect(changed).toMatchObject({ rating: "up", comment: null });
		const rows = await database.db.execute(
			sql`select rating from answer_feedback where owner_id = ${owner} and request_id = 'req_1'`,
		);
		expect([...rows]).toEqual([{ rating: "up" }]);
	});
});
