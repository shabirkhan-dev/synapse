import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase, MIGRATIONS_TABLE } from "@/database/database";
import { DrizzleRagRepository } from "@/modules/rag/rag.repository";

import { fakeEmbedding } from "./helpers";

/**
 * Real Postgres + pgvector. Opt-in: set AI_API_TEST_DATABASE_URL to a throwaway database
 * whose server has the vector extension (e.g. docker compose's pgvector/pgvector:pg18).
 */
const url = process.env.AI_API_TEST_DATABASE_URL;

describe.skipIf(!url)("DrizzleRagRepository (pgvector)", () => {
	const database = createDatabase({ url: url ?? "", poolMax: 2 });
	const repository = new DrizzleRagRepository(database.db);
	const owner = `it-${crypto.randomUUID()}`;

	beforeAll(async () => {
		await migrate(database.db, {
			migrationsFolder: join(import.meta.dir, "../src/database/migrations"),
			migrationsTable: MIGRATIONS_TABLE,
		});
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
			})),
		);
		expect(document.chunkCount).toBe(2);

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
});
