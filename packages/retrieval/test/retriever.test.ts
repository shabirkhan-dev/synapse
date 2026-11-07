import { describe, expect, test } from "bun:test";

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

	test("hybrid mode surfaces keyword-only matches", async () => {
		const { value } = ports([], [m("exact-term")]);
		const retriever = createRetriever(value, { mode: "hybrid", embeddingModel: "test:e" });
		const [match] = await retriever.retrieve({ ownerId: "u1", query: "SKU-123", topK: 5 });
		expect(match).toMatchObject({ chunkId: "exact-term", ranks: { keyword: 1 } });
	});
});
