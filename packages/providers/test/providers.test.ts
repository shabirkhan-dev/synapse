import { describe, expect, test } from "bun:test";

import { embedMany, generateText } from "ai";

import {
	apiKeyFor,
	type ChatModelSpec,
	createChatModel,
	createEmbeddingModel,
	type EmbeddingModelSpec,
	resolveChatModelSpec,
	resolveEmbeddingModelSpec,
} from "../src";

type Captured = { url: string; headers: Headers; body: Record<string, unknown> };

/** A fetch that records each request and answers with `reply` (the vendor's JSON shape). */
function fakeFetch(reply: unknown, captured: Captured[]): typeof fetch {
	const handler = async (input: string | URL | Request, init?: RequestInit) => {
		captured.push({
			url: String(input),
			headers: new Headers(init?.headers),
			body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
		});
		return Response.json(reply);
	};
	return Object.assign(handler, { preconnect: fetch.preconnect });
}

const chatReplies = {
	openai: {
		id: "resp_1",
		created_at: 1_700_000_000,
		model: "gpt-test",
		object: "response",
		status: "completed",
		output: [
			{
				type: "message",
				id: "msg_1",
				role: "assistant",
				status: "completed",
				content: [{ type: "output_text", text: "hello from openai", annotations: [] }],
			},
		],
		usage: { input_tokens: 7, output_tokens: 3 },
	},
	anthropic: {
		id: "msg_1",
		type: "message",
		role: "assistant",
		model: "claude-test",
		content: [{ type: "text", text: "hello from anthropic" }],
		stop_reason: "end_turn",
		stop_sequence: null,
		usage: { input_tokens: 7, output_tokens: 3 },
	},
	google: {
		candidates: [
			{ content: { role: "model", parts: [{ text: "hello from google" }] }, finishReason: "STOP" },
		],
		usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 3, totalTokenCount: 10 },
	},
	cohere: {
		id: "c_1",
		finish_reason: "COMPLETE",
		message: { role: "assistant", content: [{ type: "text", text: "hello from cohere" }] },
		usage: {
			billed_units: { input_tokens: 7, output_tokens: 3 },
			tokens: { input_tokens: 7, output_tokens: 3 },
		},
	},
	"openai-compatible": {
		id: "cc_1",
		object: "chat.completion",
		created: 1_700_000_000,
		model: "openai/gpt-test",
		choices: [
			{
				index: 0,
				message: { role: "assistant", content: "hello from openrouter" },
				finish_reason: "stop",
			},
		],
		usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
	},
};

const chatCases: Array<{
	spec: ChatModelSpec;
	url: string;
	auth: [string, string];
	text: string;
	provider: string;
}> = [
	{
		spec: { provider: "openai", model: "gpt-test", apiKey: "sk-test" },
		url: "https://api.openai.com/v1/responses",
		auth: ["authorization", "Bearer sk-test"],
		text: "hello from openai",
		provider: "openai",
	},
	{
		spec: { provider: "anthropic", model: "claude-test", apiKey: "ak-test" },
		url: "https://api.anthropic.com/v1/messages",
		auth: ["x-api-key", "ak-test"],
		text: "hello from anthropic",
		provider: "anthropic",
	},
	{
		spec: { provider: "google", model: "gemini-test", apiKey: "gk-test" },
		url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
		auth: ["x-goog-api-key", "gk-test"],
		text: "hello from google",
		provider: "google",
	},
	{
		spec: { provider: "cohere", model: "command-test", apiKey: "co-test" },
		url: "https://api.cohere.com/v2/chat",
		auth: ["authorization", "Bearer co-test"],
		text: "hello from cohere",
		provider: "cohere",
	},
	{
		spec: {
			provider: "openai-compatible",
			name: "openrouter",
			baseUrl: "https://openrouter.ai/api/v1",
			model: "openai/gpt-test",
			apiKey: "or-test",
		},
		url: "https://openrouter.ai/api/v1/chat/completions",
		auth: ["authorization", "Bearer or-test"],
		text: "hello from openrouter",
		provider: "openrouter",
	},
];

describe("chat models", () => {
	for (const { spec, url, auth, text, provider } of chatCases) {
		test(`${spec.provider}: calls the vendor endpoint with its key and parses the reply`, async () => {
			const captured: Captured[] = [];
			const { model, info } = createChatModel({
				...spec,
				fetch: fakeFetch(chatReplies[spec.provider], captured),
			});
			const result = await generateText({ model, prompt: "hi", maxRetries: 0 });

			expect(result.text).toBe(text);
			expect(result.usage.inputTokens).toBe(7);
			expect(info).toEqual({ provider, model: spec.model });
			expect(captured).toHaveLength(1);
			expect(captured[0]?.url).toBe(url);
			expect(captured[0]?.headers.get(auth[0])).toBe(auth[1]);
		});
	}

	test("a base URL override is used", async () => {
		const captured: Captured[] = [];
		const { model } = createChatModel({
			provider: "anthropic",
			model: "claude-test",
			apiKey: "ak",
			baseUrl: "https://proxy.example.com/v1",
			fetch: fakeFetch(chatReplies.anthropic, captured),
		});
		await generateText({ model, prompt: "hi", maxRetries: 0 });
		expect(captured[0]?.url).toBe("https://proxy.example.com/v1/messages");
	});
});

const vector = [0.25, 0.5];
const embeddingCases: Array<{
	spec: EmbeddingModelSpec;
	reply: unknown;
	url: string;
	sized: (body: Record<string, unknown>) => unknown;
}> = [
	{
		spec: { provider: "openai", model: "text-embedding-3-small", apiKey: "sk", dimensions: 1536 },
		reply: {
			object: "list",
			data: [
				{ object: "embedding", index: 0, embedding: vector },
				{ object: "embedding", index: 1, embedding: vector },
			],
			model: "text-embedding-3-small",
			usage: { prompt_tokens: 2, total_tokens: 2 },
		},
		url: "https://api.openai.com/v1/embeddings",
		sized: (body) => body.dimensions,
	},
	{
		spec: { provider: "google", model: "gemini-embedding-001", apiKey: "gk", dimensions: 1536 },
		reply: { embeddings: [{ values: vector }, { values: vector }] },
		url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents",
		sized: (body) =>
			(body.requests as Array<{ outputDimensionality?: number }> | undefined)?.[0]
				?.outputDimensionality,
	},
	{
		spec: { provider: "cohere", model: "embed-v4.0", apiKey: "co", dimensions: 1536 },
		reply: {
			id: "e_1",
			embeddings: { float: [vector, vector] },
			texts: ["refund policy", "office cat"],
			meta: { billed_units: { input_tokens: 2 } },
		},
		url: "https://api.cohere.com/v2/embed",
		sized: (body) => body.output_dimension,
	},
];

describe("embedding models", () => {
	for (const { spec, reply, url, sized } of embeddingCases) {
		test(`${spec.provider}: requests ${spec.dimensions} dimensions and returns vectors in order`, async () => {
			const captured: Captured[] = [];
			const { model, info } = createEmbeddingModel({
				...spec,
				fetch: fakeFetch(reply, captured),
			});
			const { embeddings } = await embedMany({
				model,
				values: ["refund policy", "office cat"],
				maxRetries: 0,
			});

			expect(embeddings).toEqual([vector, vector]);
			expect(info).toEqual({ provider: spec.provider, model: spec.model });
			expect(captured[0]?.url).toBe(url);
			expect(sized(captured[0]?.body ?? {})).toBe(1536);
		});
	}

	test("openai-compatible records its own name and endpoint", () => {
		const { info } = createEmbeddingModel({
			provider: "openai-compatible",
			name: "openrouter",
			baseUrl: "https://openrouter.ai/api/v1",
			model: "openai/text-embedding-3-small",
		});
		expect(info).toEqual({ provider: "openrouter", model: "openai/text-embedding-3-small" });
	});
});

describe("resolving specs from credentials", () => {
	const credentials = {
		openaiCompatible: {
			name: "openrouter",
			baseUrl: "https://openrouter.ai/api/v1",
			apiKey: "or",
			embeddingBaseUrl: "https://api.openai.com/v1",
			embeddingApiKey: "oa-embed",
		},
		anthropicApiKey: "ak",
		cohereApiKey: "co",
	};

	test("each vendor gets its own key; a separate compatible embeddings endpoint is named apart", () => {
		expect(resolveChatModelSpec("anthropic", "claude-test", credentials)).toEqual({
			provider: "anthropic",
			model: "claude-test",
			apiKey: "ak",
		});
		expect(resolveChatModelSpec("openai-compatible", "openai/gpt-test", credentials)).toEqual({
			provider: "openai-compatible",
			name: "openrouter",
			baseUrl: "https://openrouter.ai/api/v1",
			model: "openai/gpt-test",
			apiKey: "or",
		});
		expect(
			resolveEmbeddingModelSpec("openai-compatible", "text-embedding-3-small", credentials, 1536),
		).toEqual({
			provider: "openai-compatible",
			name: "openrouter-embeddings",
			baseUrl: "https://api.openai.com/v1",
			model: "text-embedding-3-small",
			dimensions: 1536,
			apiKey: "oa-embed",
		});
		expect(resolveEmbeddingModelSpec("cohere", "embed-v4.0", credentials, 1536)).toMatchObject({
			apiKey: "co",
			dimensions: 1536,
		});
	});

	test("a vendor without a key has none", () => {
		expect(apiKeyFor("google", credentials)).toBeUndefined();
		expect(resolveChatModelSpec("openai", "gpt-test", credentials)).toEqual({
			provider: "openai",
			model: "gpt-test",
		});
	});
});
