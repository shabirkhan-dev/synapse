import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import {
	createDatabase,
	ragChunks,
	runMigrations,
	searchQuery,
	searchVector,
	sourceMigrationsFolder,
} from "@synapse/database";
import { sql } from "drizzle-orm";

import { DrizzleRagRepository } from "@/modules/rag";

import { fakeEmbedding } from "./helpers";

const MODEL = "test:embed-1";
const withStartupParameter = (databaseUrl: string, parameter: string) =>
	`${databaseUrl}${databaseUrl.includes("?") ? "&" : "?"}${parameter}`;

/** Unit vector near one axis with small deterministic noise (seeded), so neighbours are dense. */
function nearAxis(axis: number, seed: number): number[] {
	let state = (seed + 7) * 2654435761;
	const noise = () => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return (state / 2147483648) * 0.05;
	};
	const values = Array.from({ length: 1536 }, (_, index) => (index === axis ? 1 : noise()));
	const norm = Math.hypot(...values);
	return values.map((value) => value / norm);
}
const vector = (ownerId: string, embedding: number[], limit: number) => ({
	ownerId,
	embedding,
	embeddingModel: MODEL,
	limit,
});

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

		const matches = await repository.searchChunks(vector(owner, fakeEmbedding("cat printer"), 2));
		expect(matches.map((m) => m.chunkIndex)).toEqual([1, 0]);
		expect(matches[0]?.score).toBeGreaterThan(matches[1]?.score ?? 1);
		expect(typeof matches[0]?.score).toBe("number");

		expect(await repository.searchChunks(vector("someone-else", fakeEmbedding("cat"), 5))).toEqual(
			[],
		);
		expect((await repository.listDocuments(owner, 10)).map((d) => d.id)).toEqual([document.id]);

		expect(await repository.deleteDocument(owner, document.id)).toBe(true);
		expect(await repository.searchChunks(vector(owner, fakeEmbedding("cat"), 5))).toEqual([]);
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
		expect((await repository.searchChunks(vector(owner, chunk.embedding, 10))).length).toBe(1);

		await repository.deleteDocument(owner, first.id);
	});

	test("keyword search ranks full-text matches and uses the GIN index", async () => {
		const document = await repository.createDocument(
			{ ownerId: owner, title: "Keywords" },
			["Order SKU-4521 ships in two days", "Unrelated text about cats"].map(
				(content, chunkIndex) => ({
					chunkIndex,
					content,
					embedding: fakeEmbedding(content),
					embeddingModel: MODEL,
				}),
			),
		);
		const matches = await repository.keywordSearch({ ownerId: owner, query: "sku-4521", limit: 5 });
		expect(matches.map((m) => m.content)).toEqual(["Order SKU-4521 ships in two days"]);
		expect(matches[0]?.score).toBeGreaterThan(0);
		expect(
			await repository.keywordSearch({ ownerId: "someone-else", query: "sku", limit: 5 }),
		).toEqual([]);

		await database.db.execute(sql`set enable_seqscan = off`);
		const plan = await database.db.execute(
			sql`explain select id from rag_chunks where ${searchVector(ragChunks.content)} @@ ${searchQuery("sku -cats")}`,
		);
		await database.db.execute(sql`reset enable_seqscan`);
		expect(JSON.stringify([...plan])).toContain("rag_chunks_content_search_idx");
		await repository.deleteDocument(owner, document.id);
	});

	test("keyword search matches any term, ranks fuller matches first and honours exclusions", async () => {
		const document = await repository.createDocument(
			{ ownerId: owner, title: "Any term" },
			[
				"Print the return label and drop the parcel at a courier point",
				"Tracking links are emailed when the parcel leaves",
				"The office cat sleeps on the printer",
			].map((content, chunkIndex) => ({
				chunkIndex,
				content,
				embedding: fakeEmbedding(content),
				embeddingModel: MODEL,
			})),
		);
		const search = (query: string) =>
			repository
				.keywordSearch({ ownerId: owner, query, limit: 5 })
				.then((matches) => matches.map((m) => m.chunkIndex));

		// No chunk has every word; common words ("how", "do", "I", "a") do not match everything.
		expect(await search("how do I return a parcel")).toEqual([0, 1]);
		expect(await search("parcel -tracking")).toEqual([0]);
		expect(await search('"courier point" or cat')).toEqual([0, 2]);

		await repository.deleteDocument(owner, document.id);
	});

	test("vector search stays complete when other tenants crowd the HNSW index", async () => {
		// Dense vectors (like real embeddings): another tenant's 300 chunks (> ef_search = 40)
		// cluster around the query; this tenant's 3 chunks are farther away.
		const crowd = await repository.createDocument(
			{ ownerId: `it-crowd-${crypto.randomUUID()}`, title: "Crowd" },
			Array.from({ length: 300 }, (_, chunkIndex) => ({
				chunkIndex,
				content: `crowd ${chunkIndex}`,
				embedding: nearAxis(0, chunkIndex),
				embeddingModel: MODEL,
			})),
		);
		const tenant = `it-tenant-${crypto.randomUUID()}`;
		const mine = await repository.createDocument(
			{ ownerId: tenant, title: "Mine" },
			[0, 1, 2].map((chunkIndex) => ({
				chunkIndex,
				content: `mine ${chunkIndex}`,
				embedding: nearAxis(1, 5000 + chunkIndex),
				embeddingModel: MODEL,
			})),
		);

		// Small owners get an exact owner-index scan; disabling sorts forces the HNSW plan that
		// large owners get, where candidates are fetched before the owner filter.
		const hnswOnly = createDatabase({
			url: withStartupParameter(url ?? "", "enable_sort=off"),
			poolMax: 1,
		});
		const matches = await new DrizzleRagRepository(hnswOnly.db).searchChunks(
			vector(tenant, nearAxis(0, -1), 5),
		);
		await hnswOnly.close();
		expect(matches.map((m) => m.content).toSorted()).toEqual(["mine 0", "mine 1", "mine 2"]);
		expect(matches.every((m) => m.documentId === mine.id)).toBe(true);

		await repository.deleteDocument(tenant, mine.id);
		await database.db.execute(sql`delete from rag_documents where id = ${crowd.id}`);
	}, 20_000);

	test("vector search ignores chunks embedded with another model", async () => {
		const embedding = fakeEmbedding("model filter");
		const document = await repository.createDocument({ ownerId: owner, title: "Models" }, [
			{ chunkIndex: 0, content: "current", embedding, embeddingModel: MODEL },
			{ chunkIndex: 1, content: "legacy", embedding },
			{ chunkIndex: 2, content: "other", embedding, embeddingModel: "other:model" },
		]);
		const matches = await repository.searchChunks(vector(owner, embedding, 10));
		expect(matches.map((m) => m.content).toSorted()).toEqual(["current", "legacy"]);
		await repository.deleteDocument(owner, document.id);
	});
});
