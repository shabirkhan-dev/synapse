import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import {
	createDatabase,
	jobCheckpoints,
	runMigrations,
	sourceMigrationsFolder,
} from "@synapse/database";
import { eq } from "drizzle-orm";

import { DrizzleSystemRepository } from "@/modules/system";

/** Real Postgres. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;

describe.skipIf(!url)("DrizzleSystemRepository (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const repository = new DrizzleSystemRepository(database.db);
	const jobId = `it-system-${crypto.randomUUID()}`;

	beforeAll(() => runMigrations(database.db, sourceMigrationsFolder));
	afterAll(async () => {
		await database.db.delete(jobCheckpoints).where(eq(jobCheckpoints.jobId, jobId));
		await database.close();
	});

	test("reads checkpoints newest first, chunks per owner, and jobs or null without pg-boss", async () => {
		await repository.ping();
		await database.db
			.insert(jobCheckpoints)
			.values({ jobId, queue: "knowledge.reembed-chunks", state: { processed: 40 } });
		const [latest] = await repository.checkpoints(1);
		expect(latest).toMatchObject({
			jobId,
			queue: "knowledge.reembed-chunks",
			state: { processed: 40 },
		});

		expect(await repository.chunkModels(`it-system-${crypto.randomUUID()}`)).toEqual([]);

		const jobs = await repository.jobCounts();
		// null until the worker has created the pgboss schema; then rows of queue × state.
		if (jobs !== null) {
			for (const row of jobs) expect(typeof row.count).toBe("number");
		}
	});
});
