import { describe, expect, test } from "bun:test";

import { loadConfiguration } from "@/config";

describe("ai config", () => {
	test("defaults to the OpenAI-compatible endpoint for chat and embeddings", () => {
		const { ai } = loadConfiguration({ AI_API_KEY: "or-not-real" });
		expect(ai.chat).toEqual({
			provider: "openai-compatible",
			name: "openrouter",
			baseUrl: "https://openrouter.ai/api/v1",
			model: "openai/gpt-4o-mini",
			apiKey: "or-not-real",
		});
		expect(ai.embedding).toMatchObject({ provider: "openai-compatible", dimensions: 1536 });
		expect(ai.fallbackChat).toBeUndefined();
	});

	test("chat, embeddings and the fallback can each use a different vendor", () => {
		const { ai } = loadConfiguration({
			AI_CHAT_PROVIDER: "anthropic",
			AI_CHAT_MODEL: "claude-test",
			ANTHROPIC_API_KEY: "ak-not-real",
			AI_EMBEDDING_PROVIDER: "openai",
			AI_EMBEDDING_MODEL: "text-embedding-3-small",
			OPENAI_API_KEY: "sk-not-real",
			AI_FALLBACK_CHAT_PROVIDER: "openai",
			AI_FALLBACK_CHAT_MODEL: "gpt-test",
		});
		expect(ai.chat).toEqual({ provider: "anthropic", model: "claude-test", apiKey: "ak-not-real" });
		expect(ai.embedding).toEqual({
			provider: "openai",
			model: "text-embedding-3-small",
			apiKey: "sk-not-real",
			dimensions: 1536,
		});
		expect(ai.fallbackChat).toEqual({
			provider: "openai",
			model: "gpt-test",
			apiKey: "sk-not-real",
		});
	});

	test("the fallback defaults to the chat vendor", () => {
		const { ai } = loadConfiguration({ AI_FALLBACK_CHAT_MODEL: "openai/gpt-test" });
		expect(ai.fallbackChat).toMatchObject({
			provider: "openai-compatible",
			model: "openai/gpt-test",
		});
	});
});
