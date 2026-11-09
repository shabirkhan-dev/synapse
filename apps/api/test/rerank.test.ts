import { describe, expect, test } from "bun:test";

import type { Reranker } from "@synapse/core/contracts";
import { MockLanguageModelV4 } from "ai/test";

import { authHeaders, buildTestApp, textGenerateResult } from "./helpers";

type App = ReturnType<typeof buildTestApp>["app"];
const base = "http://localhost/api/v1";

async function call(app: App, method: string, path: string, body?: unknown) {
	const response = await app.request(`${base}${path}`, {
		method,
		headers: await authHeaders(),
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
	return { status: response.status, body: await response.json() };
}

const documents = [
	{ title: "Refunds", content: "Refunds are accepted within 30 days of purchase." },
	{ title: "Shipping", content: "Shipping takes five days; refunds for shipping are not offered." },
	{ title: "Office", content: "The office cat is called Biscuit." },
];

/** Puts the document whose text contains `preferred` first. */
function preferring(preferred: string, calls: { documents: string[] }[] = []): Reranker {
	return {
		info: { provider: "test", model: "rerank-1" },
		rerank: async ({ documents: texts, topN }) => {
			calls.push({ documents: texts });
			return texts
				.map((text, index) => ({ index, score: text.includes(preferred) ? 0.99 : 0.1 }))
				.toSorted((a, b) => b.score - a.score)
				.slice(0, topN);
		},
	};
}

async function seeded(reranker?: Reranker) {
	const chatModel = new MockLanguageModelV4({ doGenerate: textGenerateResult("Five days [1].") });
	const built = buildTestApp({ chatModel, ...(reranker ? { reranker } : {}) });
	await Promise.all(
		documents.map((document) => call(built.app, "POST", "/rag/documents", document)),
	);
	return built;
}

describe("reranking", () => {
	test("the reranker reorders matches and is recorded in the answer's provenance and audit", async () => {
		const calls: { documents: string[] }[] = [];
		const { app, auditEvents } = await seeded(preferring("Shipping", calls));
		const answer = await call(app, "POST", "/rag/query", { query: "refunds", topK: 2 });

		expect(answer.status).toBe(200);
		const [first] = answer.body.data.matches;
		expect(first.documentTitle).toBe("Shipping");
		expect(first.score).toBe(0.99);
		expect(first.ranks.rerank).toBe(1);
		expect(answer.body.data.provenance.reranker).toBe("test:rerank-1");
		expect(calls[0]?.documents.length).toBeGreaterThanOrEqual(2);

		const answered = auditEvents.events.find((event) => event.action === "rag.query.answered");
		expect(answered?.provenance).toMatchObject({ reranker: "test:rerank-1" });
	});

	test("a failing reranker still answers, in fused order, without claiming a reranker", async () => {
		const { app } = await seeded({
			info: { provider: "test", model: "down" },
			rerank: async () => {
				throw new Error("rerank unavailable");
			},
		});
		const answer = await call(app, "POST", "/rag/query", { query: "refunds", topK: 2 });
		expect(answer.status).toBe(200);
		expect(answer.body.data.matches[0].ranks.rerank).toBeUndefined();
		expect(answer.body.data.provenance.reranker).toBeUndefined();
	});

	test("without a reranker nothing changes", async () => {
		const { app } = await seeded();
		const answer = await call(app, "POST", "/rag/query", { query: "refunds", topK: 2 });
		expect(answer.body.data.matches[0].ranks.rerank).toBeUndefined();
		expect(answer.body.data.provenance).not.toHaveProperty("reranker");
	});
});
