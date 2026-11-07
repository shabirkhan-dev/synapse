import { describe, expect, test } from "bun:test";

import { MockEmbeddingModelV4, MockLanguageModelV4 } from "ai/test";

import {
	createAiSdkModelGateway,
	createHashingEmbeddingGateway,
	createOpenAICompatibleModelGateway,
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

describe("OpenAI-compatible gateway", () => {
	test("records provider and models, with a separate embeddings provider when configured", () => {
		const gateway = createOpenAICompatibleModelGateway({
			providerName: "openrouter",
			baseUrl: "https://openrouter.ai/api/v1",
			chatModel: "openai/gpt-4o-mini",
			embedding: { model: "text-embedding-3-small", baseUrl: "https://api.openai.com/v1" },
		});
		expect(gateway.chat.info).toEqual({ provider: "openrouter", model: "openai/gpt-4o-mini" });
		expect(gateway.embedding.info).toEqual({
			provider: "openrouter-embeddings",
			model: "text-embedding-3-small",
		});
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
