import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createAuditLog } from "@synapse/audit";
import { createDatabase, runMigrations, sourceMigrationsFolder } from "@synapse/database";
import { createLongTermMemory } from "@synapse/memory";
import { sql } from "drizzle-orm";

import { DrizzleAuditRepository } from "@/modules/audit";
import { GuardrailsService } from "@/modules/guardrails";
import {
	DrizzleConversationRepository,
	DrizzleFactRepository,
	MemoryService,
} from "@/modules/memory";

import { fakeEmbedding } from "./helpers";

/** Real Postgres + pgvector. Opt-in: set API_TEST_DATABASE_URL to a throwaway database. */
const url = process.env.API_TEST_DATABASE_URL;

const embedding = {
	info: { provider: "test", model: "bow" },
	embed: async (text: string) => fakeEmbedding(text),
	embedMany: async (texts: string[]) => texts.map(fakeEmbedding),
};

const userMessage = (id: string, text: string) => ({
	id,
	role: "user" as const,
	message: { id, role: "user", parts: [{ type: "text", text }] },
});

describe.skipIf(!url)("memory (postgres)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const owner = `it-memory-${crypto.randomUUID()}`;
	const other = `it-memory-${crypto.randomUUID()}`;
	const ordering = `it-memory-${crypto.randomUUID()}`;

	/** A fresh service over the same database, like the API after a restart. */
	const startService = () => {
		const audit = createAuditLog({
			store: new DrizzleAuditRepository(database.db),
			redact: (d) => d,
		});
		return new MemoryService({
			conversations: new DrizzleConversationRepository(database.db),
			facts: createLongTermMemory({
				store: new DrizzleFactRepository(database.db),
				embedding,
				embeddingModel: "test:bow",
			}),
			audit,
			history: { maxTokens: 6000, maxMessages: 50 },
			guardrails: new GuardrailsService({ maxInputChars: 4000, blockedTerms: [] }, audit),
		});
	};

	beforeAll(async () => {
		await runMigrations(database.db, sourceMigrationsFolder);
	});

	afterAll(async () => {
		const ids = [owner, other, ordering];
		await database.db.execute(sql`delete from chat_conversations where owner_id in ${ids}`);
		await database.db.execute(sql`delete from memory_facts where owner_id in ${ids}`);
		await database.db.execute(sql`delete from audit_events where owner_id in ${ids}`);
		await database.close();
	});

	test("a conversation reloads after a restart, in order, and only for its owner", async () => {
		const before = startService();
		const started = await before.continueConversation(
			owner,
			undefined,
			userMessage("m1", "My name is Ada"),
		);
		await before.saveMessages(owner, started.conversationId, [
			userMessage("m1", "My name is Ada"),
			{
				id: "m2",
				role: "assistant",
				message: { id: "m2", role: "assistant", parts: [{ type: "text", text: "Hi Ada" }] },
			},
		]);

		const after = startService();
		const continued = await after.continueConversation(
			owner,
			started.conversationId,
			userMessage("m3", "Name?"),
		);
		expect(continued.history.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
		await expect(
			after.continueConversation(other, started.conversationId, userMessage("x", "hi")),
		).rejects.toMatchObject({
			code: "MEMORY_CONVERSATION_NOT_FOUND",
		});
		expect((await after.listConversations(owner)).map((c) => c.title)).toEqual(["My name is Ada"]);
	});

	test("messages keep insertion order, and a turn reads only the latest it can use", async () => {
		const repository = new DrizzleConversationRepository(database.db);
		const conversation = await repository.create(ordering, "Ordering");
		// One insert: the rows share created_at, so only the ordinal keeps their order.
		await repository.append(
			ordering,
			conversation.id,
			["z1", "a2", "m3", "b4"].map((id) => userMessage(id, id)),
		);
		await repository.append(ordering, conversation.id, [userMessage("c5", "c5")]);

		const all = await repository.messages(ordering, conversation.id);
		expect(all.map((m) => m.id)).toEqual(["z1", "a2", "m3", "b4", "c5"]);
		const latest = await repository.messages(ordering, conversation.id, { latest: 2 });
		expect(latest.map((m) => m.id)).toEqual(["b4", "c5"]);
		expect(await repository.messages(other, conversation.id, { latest: 2 })).toEqual([]);

		const audit = createAuditLog({
			store: new DrizzleAuditRepository(database.db),
			redact: (d) => d,
		});
		const service = new MemoryService({
			conversations: repository,
			facts: createLongTermMemory({
				store: new DrizzleFactRepository(database.db),
				embedding,
				embeddingModel: "test:bow",
			}),
			audit,
			history: { maxTokens: 6000, maxMessages: 3 },
			guardrails: new GuardrailsService({ maxInputChars: 4000, blockedTerms: [] }, audit),
		});
		const turn = await service.continueConversation(
			ordering,
			conversation.id,
			userMessage("d6", "d6"),
		);
		expect(turn.history.map((m) => m.id)).toEqual(["b4", "c5", "d6"]);
	});

	test("facts are recalled by similarity per owner, deduplicated, and forgotten", async () => {
		const service = startService();
		await service.rememberFact(owner, "prefers metric units for distances");
		await service.rememberFact(owner, "prefers metric units for distances");
		await service.rememberFact(owner, "drinks green tea every morning");
		await service.rememberFact(other, "prefers imperial units for distances");

		expect(await service.listFacts(owner)).toHaveLength(2);
		const context = await service.recallContext(owner, "what units for distances");
		expect(context).toContain("prefers metric units for distances");
		expect(context).not.toContain("imperial");

		expect(await service.forgetEverything(owner)).toEqual({ conversations: 1, facts: 2 });
		expect(await service.listFacts(owner)).toEqual([]);
		expect(await service.listFacts(other)).toHaveLength(1);
	});
});
