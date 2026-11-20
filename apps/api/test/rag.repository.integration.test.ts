import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import {
	chunkSearchText,
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

/** A reader that sees every document of the owner (as scripts and approved actions do). */
const everything = (ownerId: string) => ({ ownerId, userId: null, readsAll: true }) as const;

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

	test("finds a document and pages its chunks in order, only for its owner", async () => {
		// Its own owner, so these chunks never show up in the other tests' searches.
		const paged = `it-${crypto.randomUUID()}`;
		const document = await repository.createDocument(
			{ ownerId: paged, title: "Paged" },
			[2, 0, 1].map((chunkIndex) => ({
				chunkIndex,
				content: `part ${chunkIndex}`,
				embedding: fakeEmbedding(`part ${chunkIndex}`),
				chunkerVersion: "text-v1",
				embeddingModel: chunkIndex === 2 ? "old:model" : MODEL,
			})),
		);
		expect(await repository.findDocument(everything(paged), document.id)).toMatchObject({
			title: "Paged",
		});
		expect(
			await repository.findDocument(everything(`it-${crypto.randomUUID()}`), document.id),
		).toBeNull();
		const page = (offset: number, limit: number) =>
			repository.listChunks({ ownerId: paged, documentId: document.id, offset, limit });
		expect((await page(0, 10)).map((chunk) => chunk.content)).toEqual([
			"part 0",
			"part 1",
			"part 2",
		]);
		expect(await page(1, 1)).toEqual([
			expect.objectContaining({ chunkIndex: 1, chunkerVersion: "text-v1", embeddingModel: MODEL }),
		]);
		expect((await page(2, 5))[0]?.embeddingModel).toBe("old:model");
		expect(
			await repository.listChunks({
				ownerId: `it-${crypto.randomUUID()}`,
				documentId: document.id,
				offset: 0,
				limit: 10,
			}),
		).toEqual([]);
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
		expect((await repository.listDocuments(everything(owner), 10)).map((d) => d.id)).toEqual([
			document.id,
		]);

		expect(await repository.deleteDocument(everything(owner), document.id)).toBe(true);
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

		await repository.deleteDocument(everything(owner), first.id);
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
			sql`explain select id from rag_chunks where ${searchVector(chunkSearchText(ragChunks))} @@ ${searchQuery("sku -cats")}`,
		);
		await database.db.execute(sql`reset enable_seqscan`);
		expect(JSON.stringify([...plan])).toContain("rag_chunks_search_idx");
		await repository.deleteDocument(everything(owner), document.id);
	});

	test("a chunk is found by words that are only in its context (title › headings), and returns it", async () => {
		const contextOwner = `it-${crypto.randomUUID()}`;
		const document = await repository.createDocument(
			{ ownerId: contextOwner, title: "Lumen warranty" },
			[
				{
					chunkIndex: 0,
					content: "Zippers and buckles are replaced free for the life of the product.",
					context: "Lumen warranty › Hardware",
					embedding: fakeEmbedding("zippers"),
					embeddingModel: MODEL,
				},
			],
		);
		const matches = await repository.keywordSearch({
			ownerId: contextOwner,
			query: "warranty hardware",
			limit: 5,
		});
		expect(matches).toHaveLength(1);
		expect(matches[0]).toMatchObject({ context: "Lumen warranty › Hardware" });
		const [chunk] = await repository.listChunks({
			ownerId: contextOwner,
			documentId: document.id,
			offset: 0,
			limit: 5,
		});
		expect(chunk?.context).toBe("Lumen warranty › Hardware");
		await repository.deleteDocument(everything(contextOwner), document.id);
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

		await repository.deleteDocument(everything(owner), document.id);
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

		await repository.deleteDocument(everything(tenant), mine.id);
		await database.db.execute(sql`delete from rag_documents where id = ${crowd.id}`);
	}, 20_000);

	test("a search narrowed to chosen documents reads only them, exactly, and never another owner's", async () => {
		const tenant = `it-scope-${crypto.randomUUID()}`;
		// The same owner's 300 chunks sit right at the query; the chosen document is far from it.
		const crowd = await repository.createDocument(
			{ ownerId: tenant, title: "Crowd" },
			Array.from({ length: 300 }, (_, chunkIndex) => ({
				chunkIndex,
				content: `crowd handbook ${chunkIndex}`,
				embedding: nearAxis(0, chunkIndex),
				embeddingModel: MODEL,
			})),
		);
		const chosen = await repository.createDocument(
			{ ownerId: tenant, title: "Chosen" },
			[0, 1].map((chunkIndex) => ({
				chunkIndex,
				content: `chosen handbook ${chunkIndex}`,
				embedding: nearAxis(1, 9000 + chunkIndex),
				embeddingModel: MODEL,
			})),
		);
		const other = `it-scope-other-${crypto.randomUUID()}`;
		const theirs = await repository.createDocument({ ownerId: other, title: "Theirs" }, [
			{
				chunkIndex: 0,
				content: "their handbook",
				embedding: nearAxis(0, -2),
				embeddingModel: MODEL,
			},
		]);
		const query = vector(tenant, nearAxis(0, -1), 5);

		// Unscoped, the crowd fills every place.
		const all = await repository.searchChunks(query);
		expect(all.every((match) => match.documentId === crowd.id)).toBe(true);

		// Where the planner would otherwise walk HNSW (sorts off), the scoped search still returns
		// exactly the chosen chunks (the repository turns index scans off for it).
		const hnswOnly = createDatabase({
			url: withStartupParameter(url ?? "", "enable_sort=off"),
			poolMax: 1,
		});
		const scoped = await new DrizzleRagRepository(hnswOnly.db).searchChunks({
			...query,
			documentIds: [chosen.id],
		});
		await hnswOnly.close();
		expect(scoped.map((match) => match.content).toSorted()).toEqual([
			"chosen handbook 0",
			"chosen handbook 1",
		]);

		const keyword = await repository.keywordSearch({
			ownerId: tenant,
			query: "handbook",
			limit: 5,
			documentIds: [chosen.id],
		});
		expect(keyword.map((match) => match.documentId)).toEqual([chosen.id, chosen.id]);

		// Another owner's document id matches nothing, in either search.
		expect(await repository.searchChunks({ ...query, documentIds: [theirs.id] })).toEqual([]);
		expect(
			await repository.keywordSearch({
				ownerId: tenant,
				query: "handbook",
				limit: 5,
				documentIds: [theirs.id],
			}),
		).toEqual([]);

		await repository.deleteDocument(everything(tenant), crowd.id);
		await repository.deleteDocument(everything(tenant), chosen.id);
		await repository.deleteDocument(everything(other), theirs.id);
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
		await repository.deleteDocument(everything(owner), document.id);
	});
});
