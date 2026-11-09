import { describe, expect, test } from "bun:test";

import { MockEmbeddingModelV4, MockLanguageModelV4 } from "ai/test";

import {
	createAiSdkModelGateway,
	createHashingEmbeddingGateway,
	createModelGateway,
	createReranker,
	createTermOverlapReranker,
} from "../src";

const chatInfo = { provider: "test", model: "chat-1" };
const embeddingInfo = { provider: "test", model: "embed-1" };

function buildGateway() {
	const chatModel = new MockLanguageModelV4({
		doGenerate: {
			content: [{ type: "text", text: "hello" }],
			finishReason: { unified: "stop", raw: "stop" },
			usage: {
				inputTokens: { total: 12, noCache: 12, cacheRead: undefined, cacheWrite: undefined },
				outputTokens: { total: 3, text: 3, reasoning: undefined },
			},
			warnings: [],
		},
	});
	const embeddingModel = new MockEmbeddingModelV4({
		maxEmbeddingsPerCall: 10,
		doEmbed: async ({ values }) => ({
			embeddings: values.map((value) => [String(value).length, 1]),
			usage: { tokens: values.length },
			warnings: [],
		}),
	});
	const gateway = createAiSdkModelGateway({ chatModel, embeddingModel, chatInfo, embeddingInfo });
	return { gateway, chatModel, embeddingModel };
}

describe("AI SDK model gateway", () => {
	test("generateText returns text, model info and usage", async () => {
		const { gateway, chatModel } = buildGateway();
		const result = await gateway.chat.generateText({ system: "be brief", prompt: "hi" });
		expect(result).toEqual({
			text: "hello",
			model: chatInfo,
			usage: { inputTokens: 12, outputTokens: 3 },
		});
		expect(chatModel.doGenerateCalls).toHaveLength(1);
		expect(gateway.chat.info).toEqual(chatInfo);
	});

	test("embed and embedMany keep input order", async () => {
		const { gateway } = buildGateway();
		expect(await gateway.embedding.embed("abc")).toEqual([3, 1]);
		expect(await gateway.embedding.embedMany(["a", "abcd"])).toEqual([
			[1, 1],
			[4, 1],
		]);
		expect(gateway.embedding.info).toEqual(embeddingInfo);
	});

	test("exposes the raw chat model for streaming callers", () => {
		const { gateway, chatModel } = buildGateway();
		expect(gateway.chatModel).toBe(chatModel);
	});
});

describe("vendor model gateway", () => {
	test("chat and embeddings can come from different vendors; info names each one", () => {
		const gateway = createModelGateway({
			chat: { provider: "anthropic", model: "claude-test", apiKey: "ak" },
			embedding: {
				provider: "openai-compatible",
				name: "openrouter",
				baseUrl: "https://openrouter.ai/api/v1",
				model: "openai/text-embedding-3-small",
			},
		});
		expect(gateway.chat.info).toEqual({ provider: "anthropic", model: "claude-test" });
		expect(gateway.embedding.info).toEqual({
			provider: "openrouter",
			model: "openai/text-embedding-3-small",
		});
	});

	test("a direct vendor answers through the gateway and the result names it", async () => {
		const reply = {
			id: "msg_1",
			type: "message",
			role: "assistant",
			model: "claude-test",
			content: [{ type: "text", text: "hello" }],
			stop_reason: "end_turn",
			stop_sequence: null,
			usage: { input_tokens: 4, output_tokens: 1 },
		};
		const urls: string[] = [];
		const fakeFetch = Object.assign(
			async (input: string | URL | Request) => {
				urls.push(String(input));
				return Response.json(reply);
			},
			{ preconnect: fetch.preconnect },
		);
		const gateway = createModelGateway({
			chat: { provider: "anthropic", model: "claude-test", apiKey: "ak", fetch: fakeFetch },
			embedding: { provider: "openai", model: "text-embedding-3-small", apiKey: "sk" },
		});
		expect(await gateway.chat.generateText({ prompt: "hi" })).toEqual({
			text: "hello",
			model: { provider: "anthropic", model: "claude-test" },
			usage: { inputTokens: 4, outputTokens: 1 },
		});
		expect(urls).toEqual(["https://api.anthropic.com/v1/messages"]);
	});
});

const dot = (x: number[] = [], y: number[] = []) =>
	x.reduce((sum, v, i) => sum + v * (y[i] ?? 0), 0);

describe("hashing embedding gateway", () => {
	test("is deterministic, normalized and sized, and similar text scores higher", async () => {
		const gateway = createHashingEmbeddingGateway({ dimensions: 64 });
		const [a, b, c] = await gateway.embedMany(["refund policy", "Refund POLICY!", "office cat"]);
		expect(a).toEqual(b ?? []);
		expect(a).toHaveLength(64);
		expect(Math.hypot(...(a ?? []))).toBeCloseTo(1, 10);
		expect(dot(a, b)).toBeGreaterThan(dot(a, c));
		expect(gateway.info).toEqual({ provider: "hashing", model: "bow-v1" });
		expect(await gateway.embed("refund policy")).toEqual(a ?? []);
	});
});

describe("rerankers", () => {
	test("the offline term-overlap reranker scores by shared words and keeps ties in order", async () => {
		const reranker = createTermOverlapReranker();
		const ranked = await reranker.rerank({
			query: "refund policy days",
			documents: ["office cat", "refund window in days", "refund policy days", "policy"],
			topN: 3,
		});
		expect(ranked).toEqual([
			{ index: 2, score: 1 },
			{ index: 1, score: 2 / 3 },
			{ index: 3, score: 1 / 3 },
		]);
		expect(reranker.info).toEqual({ provider: "offline", model: "term-overlap-v1" });
	});

	test("a vendor reranker maps the ranking to document indexes", async () => {
		const fakeFetch = Object.assign(
			async () =>
				Response.json({
					id: "r_1",
					results: [{ index: 1, relevance_score: 0.8 }],
					meta: { billed_units: { search_units: 1 } },
				}),
			{ preconnect: fetch.preconnect },
		);
		const reranker = createReranker({
			provider: "cohere",
			model: "rerank-v3.5",
			apiKey: "co",
			fetch: fakeFetch,
		});
		expect(await reranker.rerank({ query: "q", documents: ["a", "b"], topN: 1 })).toEqual([
			{ index: 1, score: 0.8 },
		]);
		expect(reranker.info).toEqual({ provider: "cohere", model: "rerank-v3.5" });
	});
});
