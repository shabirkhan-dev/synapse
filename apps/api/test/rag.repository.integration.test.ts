import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createDatabase, runMigrations, sourceMigrationsFolder } from "@synapse/database";
import { sql } from "drizzle-orm";

import { DrizzleRagRepository } from "@/modules/rag";

import { fakeEmbedding } from "./helpers";

/**
 * Real Postgres + pgvector. Opt-in: set API_TEST_DATABASE_URL to a throwaway database
 * whose server has the vector extension (e.g. docker compose's pgvector/pgvector:pg18).
 */
const url = process.env.API_TEST_DATABASE_URL;

describe.skipIf(!url)("DrizzleRagRepository (pgvector)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const repository = new DrizzleRagRepository(database.db);
	const owner = `it-${crypto.randomUUID()}`;

	beforeAll(async () => {
		await runMigrations(database.db, sourceMigrationsFolder);
	});

	afterAll(async () => {
		await database.db.execute(sql`delete from rag_documents where owner_id like 'it-%'`);
		await database.close();
	});

	test("stores chunks and ranks them by cosine similarity", async () => {
		const texts = ["refunds are accepted within 30 days", "the office cat sleeps on the printer"];
		const document = await repository.createDocument(
			{ ownerId: owner, title: "Mixed", source: null, metadata: { lang: "en" } },
			texts.map((content, chunkIndex) => ({
				chunkIndex,
				content,
				embedding: fakeEmbedding(content),
				chunkerVersion: "text-v1;size=1000;overlap=150",
				embeddingModel: "test:embed-1",
			})),
		);
		expect(document.chunkCount).toBe(2);
		const versions = await database.db.execute(
			sql`select distinct chunker_version, embedding_model from rag_chunks where document_id = ${document.id}`,
		);
		expect([...versions]).toEqual([
			{ chunker_version: "text-v1;size=1000;overlap=150", embedding_model: "test:embed-1" },
		]);

		const matches = await repository.searchChunks(owner, fakeEmbedding("cat printer"), 2);
		expect(matches.map((m) => m.chunkIndex)).toEqual([1, 0]);
		expect(matches[0]?.score).toBeGreaterThan(matches[1]?.score ?? 1);
		expect(typeof matches[0]?.score).toBe("number");

		expect(await repository.searchChunks("someone-else", fakeEmbedding("cat"), 5)).toEqual([]);
		expect((await repository.listDocuments(owner, 10)).map((d) => d.id)).toEqual([document.id]);

		expect(await repository.deleteDocument(owner, document.id)).toBe(true);
		expect(await repository.searchChunks(owner, fakeEmbedding("cat"), 5)).toEqual([]);
		await repository.ping();
	});

	test("finds documents by content hash and returns the winner on a hash conflict", async () => {
		const hash = "a".repeat(64);
		const chunk = { chunkIndex: 0, content: "dedup me", embedding: fakeEmbedding("dedup me") };
		const first = await repository.createDocument(
			{ ownerId: owner, title: "First", contentHash: hash },
			[chunk],
		);
		expect(first.contentHash).toBe(hash);
		expect((await repository.findByContentHash(owner, hash))?.id).toBe(first.id);
		expect(await repository.findByContentHash("someone-else", hash)).toBeNull();

		// A racing insert with the same owner + hash returns the existing row instead of failing.
		const second = await repository.createDocument(
			{ ownerId: owner, title: "Second", contentHash: hash },
			[chunk],
		);
		expect(second.id).toBe(first.id);
		expect((await repository.searchChunks(owner, chunk.embedding, 10)).length).toBe(1);

		await repository.deleteDocument(owner, first.id);
	});
});
