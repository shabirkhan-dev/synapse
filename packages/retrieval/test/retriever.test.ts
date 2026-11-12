import { describe, expect, test } from "bun:test";

import type { Reranker } from "@synapse/core/contracts";

import { createRetriever, type RetrievalPorts } from "../src";

type Match = { chunkId: string; score: number; content: string };

function ports(vector: Match[], keyword: Match[]) {
	const calls = { vector: [] as unknown[], keyword: [] as unknown[] };
	const value: RetrievalPorts<Match> = {
		embedQuery: async () => [1, 0],
		vectorSearch: async (request) => {
			calls.vector.push(request);
			return vector.slice(0, request.limit);
		},
		keywordSearch: async (request) => {
			calls.keyword.push(request);
			return keyword.slice(0, request.limit);
		},
	};
	return { value, calls };
}

const m = (chunkId: string, score = 0.5): Match => ({ chunkId, score, content: chunkId });

describe("retriever", () => {
	test("vector mode keeps cosine scores and never runs keyword search", async () => {
		const { value, calls } = ports([m("a", 0.9), m("b", 0.8)], [m("z")]);
		const retriever = createRetriever(value, { mode: "vector", embeddingModel: "test:e" });
		const matches = await retriever.retrieve({ ownerId: "u1", query: "q", topK: 2 });
		expect(matches).toEqual([
			{ ...m("a", 0.9), ranks: { vector: 1 } },
			{ ...m("b", 0.8), ranks: { vector: 2 } },
		]);
		expect(calls.vector).toEqual([
			{ ownerId: "u1", embedding: [1, 0], embeddingModel: "test:e", limit: 2 },
		]);
		expect(calls.keyword).toHaveLength(0);
	});

	test("hybrid mode fuses both lists, over-fetches candidates and trims to topK", async () => {
		const { value, calls } = ports([m("a"), m("b"), m("c")], [m("c"), m("d")]);
		const retriever = createRetriever(value, {
			mode: "hybrid",
			embeddingModel: "test:e",
			candidateMultiplier: 3,
		});
		const matches = await retriever.retrieve({ ownerId: "u1", query: "refund", topK: 2 });
		expect(matches.map((match) => match.chunkId)).toEqual(["c", "a"]);
		expect(matches[0]?.ranks).toEqual({ vector: 3, keyword: 1 });
		expect(matches[1]?.ranks).toEqual({ vector: 1 });
		expect(calls.keyword).toEqual([{ ownerId: "u1", query: "refund", limit: 6 }]);
	});

	test("keyword mode runs full-text search only and embeds nothing", async () => {
		const { value, calls } = ports([m("a")], [m("k1", 0.3), m("k2", 0.1)]);
		let embedded = 0;
		const retriever = createRetriever(
			{
				...value,
				embedQuery: async () => {
					embedded += 1;
					return [1, 0];
				},
			},
			{ mode: "keyword", embeddingModel: "test:e" },
		);
		const matches = await retriever.retrieve({ ownerId: "u1", query: "SKU-1", topK: 5 });
		expect(matches).toEqual([
			{ ...m("k1", 0.3), ranks: { keyword: 1 } },
			{ ...m("k2", 0.1), ranks: { keyword: 2 } },
		]);
		expect(calls.vector).toHaveLength(0);
		expect(embedded).toBe(0);
	});

	test("a call can run another mode than the configured one", async () => {
		const { value, calls } = ports([m("a", 0.9)], [m("k")]);
		const retriever = createRetriever(value, { mode: "hybrid", embeddingModel: "test:e" });
		const vector = await retriever.retrieve({ ownerId: "u1", query: "q", topK: 1, mode: "vector" });
		expect(vector).toEqual([{ ...m("a", 0.9), ranks: { vector: 1 } }]);
		expect(calls.keyword).toHaveLength(0);
		const keyword = await retriever.retrieve({
			ownerId: "u1",
			query: "q",
			topK: 1,
			mode: "keyword",
		});
		expect(keyword[0]?.ranks).toEqual({ keyword: 1 });
		expect(retriever.mode).toBe("hybrid");
	});

	test("hybrid mode surfaces keyword-only matches", async () => {
		const { value } = ports([], [m("exact-term")]);
		const retriever = createRetriever(value, { mode: "hybrid", embeddingModel: "test:e" });
		const [match] = await retriever.retrieve({ ownerId: "u1", query: "SKU-123", topK: 5 });
		expect(match).toMatchObject({ chunkId: "exact-term", ranks: { keyword: 1 } });
	});
});

/** Ranks documents by the position of their text in `order` (unknown text last). */
function fakeReranker(
	order: string[],
	seen: { documents: string[]; topN: number }[] = [],
): Reranker {
	return {
		info: { provider: "fake", model: "rerank-1" },
		rerank: async ({ documents, topN }) => {
			seen.push({ documents, topN });
			return documents
				.map((text, index) => ({ index, score: 1 - (order.indexOf(text) + 1) / 10 }))
				.filter(({ index }) => order.includes(documents[index] ?? ""))
				.toSorted((a, b) => b.score - a.score)
				.slice(0, topN);
		},
	};
}

describe("reranking", () => {
	test("the best candidates are reordered: reranker score, rerank rank, first-stage ranks kept", async () => {
		const { value, calls } = ports([m("a"), m("b"), m("c"), m("d")], [m("c"), m("a")]);
		const seen: { documents: string[]; topN: number }[] = [];
		const retriever = createRetriever(value, {
			mode: "hybrid",
			embeddingModel: "test:e",
			rerank: {
				reranker: fakeReranker(["d", "c"], seen),
				text: (match) => match.content,
				candidates: 4,
			},
		});
		const matches = await retriever.retrieve({ ownerId: "u1", query: "q", topK: 2 });

		expect(matches.map((match) => match.chunkId)).toEqual(["d", "c"]);
		expect(matches[0]).toMatchObject({ score: 0.9, ranks: { vector: 4, rerank: 1 } });
		expect(matches[1]?.ranks).toEqual({ vector: 3, keyword: 1, rerank: 2 });
		expect(seen).toEqual([{ documents: ["a", "c", "b", "d"], topN: 2 }]);
		expect(retriever.reranker).toBe("fake:rerank-1");
		// Over-fetch covers the candidate count.
		expect((calls.vector[0] as { limit: number }).limit).toBe(8);
	});

	test("vector mode fetches the candidate count, then reranks to topK", async () => {
		const { value, calls } = ports([m("a", 0.9), m("b", 0.8), m("c", 0.7)], []);
		const retriever = createRetriever(value, {
			mode: "vector",
			embeddingModel: "test:e",
			rerank: { reranker: fakeReranker(["c", "a"]), text: (match) => match.content, candidates: 3 },
		});
		const matches = await retriever.retrieve({ ownerId: "u1", query: "q", topK: 1 });
		expect(matches).toEqual([{ ...m("c"), score: 0.9, ranks: { vector: 3, rerank: 1 } }]);
		expect((calls.vector[0] as { limit: number }).limit).toBe(3);
	});

	test("a failing reranker falls back to the first-stage order and reports the error", async () => {
		const { value } = ports([m("a", 0.9), m("b", 0.8), m("c", 0.7)], []);
		const errors: unknown[] = [];
		const retriever = createRetriever(value, {
			mode: "vector",
			embeddingModel: "test:e",
			rerank: {
				reranker: {
					info: { provider: "fake", model: "down" },
					rerank: async () => {
						throw new Error("reranker unavailable");
					},
				},
				text: (match) => match.content,
				candidates: 3,
				onError: (error) => errors.push(error),
			},
		});
		const matches = await retriever.retrieve({ ownerId: "u1", query: "q", topK: 2 });
		expect(matches).toEqual([
			{ ...m("a", 0.9), ranks: { vector: 1 } },
			{ ...m("b", 0.8), ranks: { vector: 2 } },
		]);
		expect(errors).toHaveLength(1);
	});

	test("nothing found means no reranker call", async () => {
		const { value } = ports([], []);
		const seen: { documents: string[]; topN: number }[] = [];
		const retriever = createRetriever(value, {
			mode: "hybrid",
			embeddingModel: "test:e",
			rerank: { reranker: fakeReranker([], seen), text: (match) => match.content, candidates: 5 },
		});
		expect(await retriever.retrieve({ ownerId: "u1", query: "q", topK: 2 })).toEqual([]);
		expect(seen).toEqual([]);
	});
});
