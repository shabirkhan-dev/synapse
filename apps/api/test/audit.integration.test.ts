import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { MockLanguageModelV4 } from "ai/test";

import { createAiSdkModelGateway } from "@synapse/adapters/model-gateway";
import { createAuditLog } from "@synapse/audit";
import {
	auditEvents,
	createDatabase,
	runMigrations,
	sourceMigrationsFolder,
} from "@synapse/database";
import { redactPiiDeep } from "@synapse/security";
import { sql } from "drizzle-orm";

import { DrizzleAuditRepository } from "@/modules/audit";
import { GuardrailsService } from "@/modules/guardrails";
import { DrizzleRagRepository, RagService } from "@/modules/rag";

import { createMockEmbeddingModel, testConfig, textGenerateResult } from "./helpers";

const provenance = (chatModel: string, inputTokens: number) => ({
	chatModel,
	promptVersion: "rag-answer@2",
	embeddingModel: "mock:embed",
	chunkerVersion: "text-v1",
	usage: { inputTokens, outputTokens: 1 },
});

/** Real Postgres + pgvector. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;

describe.skipIf(!url)("audit trail (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const owner = `it-audit-${crypto.randomUUID()}`;
	const audit = createAuditLog({
		store: new DrizzleAuditRepository(database.db),
		redact: redactPiiDeep,
	});

	beforeAll(async () => {
		await runMigrations(database.db, sourceMigrationsFolder);
	});

	afterAll(async () => {
		await database.db.execute(sql`delete from rag_documents where owner_id = ${owner}`);
		await database.db.execute(sql`delete from audit_events where owner_id = ${owner}`);
		await database.close();
	});

	test("every answered query writes one event with its provenance", async () => {
		const rag = new RagService(
			new DrizzleRagRepository(database.db),
			createAiSdkModelGateway({
				chatModel: new MockLanguageModelV4({
					doGenerate: textGenerateResult("Within 30 days [1]."),
				}),
				embeddingModel: createMockEmbeddingModel(),
				chatInfo: { provider: "mock", model: "mock-chat" },
				embeddingInfo: { provider: "mock", model: "mock-embedding" },
			}),
			{
				chunk: testConfig.rag.chunk,
				defaultTopK: 3,
				searchMode: "vector",
				maxContextTokens: 3000,
				audit,
				guardrails: new GuardrailsService({ maxInputChars: 4000, blockedTerms: [] }, audit),
			},
		);
		await rag.ingest(owner, { title: "Refunds", content: "Refunds are accepted within 30 days." });
		await rag.answer(owner, "refund window? call +1 415 555 0100", undefined, {
			requestId: "req_it_1",
		});
		await rag.answer(owner, "how many days for a refund?", undefined, { requestId: "req_it_2" });

		const answered = await audit.list(owner, { limit: 10, action: "rag.query.answered" });
		expect(answered.map((e) => e.requestId)).toEqual(["req_it_2", "req_it_1"]);
		expect(answered[1]).toMatchObject({
			data: { question: "refund window? call [phone]", answer: "Within 30 days [1]." },
			provenance: {
				chatModel: "mock:mock-chat",
				promptVersion: "rag-answer@2",
				embeddingModel: "mock:mock-embedding",
				chunkerVersion: "text-v1;size=200;overlap=20",
			},
		});
		expect((await audit.list(owner, { limit: 10 })).map((e) => e.action)).toContain(
			"rag.document.ingested",
		);
	});

	test("events cannot be changed after they are written", async () => {
		const event = await audit.record({
			ownerId: owner,
			actorId: owner,
			action: "rag.document.deleted",
			subjectType: "document",
			subjectId: "doc-1",
			requestId: null,
			data: {},
			provenance: null,
		});
		// Drizzle queries are lazy thenables; wrap so `rejects` gets a real Promise.
		const tamper = async () => {
			await database.db.execute(
				sql`update audit_events set action = 'tampered' where id = ${event.id}`,
			);
		};
		const error = await tamper().catch((caught: unknown) => caught);
		// Drizzle wraps the driver error; the trigger's message is in `cause`.
		expect(String((error as Error).cause)).toContain("audit_events is append-only");
		const [row] = await database.db.execute(
			sql`select action from audit_events where id = ${event.id}`,
		);
		expect(row).toEqual({ action: "rag.document.deleted" });
	});

	test("usage groups answered queries by UTC day and models, for one actor when asked", async () => {
		const usageOwner = `it-usage-${crypto.randomUUID()}`;
		const row = (actorId: string, createdAt: string, chatModel: string, inputTokens: number) => ({
			ownerId: usageOwner,
			actorId,
			action: "rag.query.answered",
			subjectType: "query",
			subjectId: null,
			requestId: null,
			data: {},
			provenance: provenance(chatModel, inputTokens),
			createdAt: new Date(createdAt),
		});
		await database.db
			.insert(auditEvents)
			.values([
				row("ada", "2026-11-10T23:30:00Z", "mock:a", 10),
				row("bob", "2026-11-10T08:00:00Z", "mock:a", 5),
				row("ada", "2026-11-11T00:30:00Z", "mock:b", 7),
				row("ada", "2026-10-01T12:00:00Z", "mock:a", 100),
				{ ...row("ada", "2026-11-11T09:00:00Z", "mock:a", 1), action: "rag.document.ingested" },
				{ ...row("ada", "2026-11-10T09:00:00Z", "mock:a", 3), action: "chat.message.answered" },
			]);
		const store = new DrizzleAuditRepository(database.db);
		const since = new Date("2026-11-10T00:00:00Z");
		const all = await store.usage({ ownerId: usageOwner, actions: ["rag.query.answered"], since });
		expect(all.toSorted((a, b) => a.day.localeCompare(b.day))).toEqual([
			expect.objectContaining({
				day: "2026-11-10",
				chatModel: "mock:a",
				answers: 2,
				inputTokens: 15,
			}),
			expect.objectContaining({
				day: "2026-11-11",
				chatModel: "mock:b",
				answers: 1,
				inputTokens: 7,
			}),
		]);
		const ada = await store.usage({
			ownerId: usageOwner,
			actions: ["rag.query.answered"],
			since,
			actorId: "ada",
		});
		expect(ada.reduce((total, group) => total + group.answers, 0)).toBe(2);
		// Chat answers are their own group, with their action.
		const both = await store.usage({
			ownerId: usageOwner,
			actions: ["rag.query.answered", "chat.message.answered"],
			since,
		});
		expect(both.filter((group) => group.day === "2026-11-10")).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ action: "rag.query.answered", answers: 2 }),
				expect.objectContaining({ action: "chat.message.answered", answers: 1, inputTokens: 3 }),
			]),
		);
		await database.db.execute(sql`delete from audit_events where owner_id = ${usageOwner}`);
	});
});
