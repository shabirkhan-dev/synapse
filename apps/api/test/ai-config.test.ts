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

	test("reranking is off unless a provider is set; then it uses that vendor's key", () => {
		expect(loadConfiguration({}).ai.rerank).toBeUndefined();
		const { ai, rag } = loadConfiguration({ AI_RERANK_PROVIDER: "cohere", COHERE_API_KEY: "co" });
		expect(ai.rerank).toEqual({
			spec: { provider: "cohere", model: "rerank-v3.5", apiKey: "co" },
			timeoutMs: 5000,
		});
		expect(rag.rerankCandidates).toBe(20);
	});

	test("in production a reranker needs its key", () => {
		expect(() =>
			loadConfiguration({
				NODE_ENV: "production",
				JWT_SECRET: "x".repeat(40),
				RESEND_API_KEY: "re_test_not_real",
				AI_API_KEY: "or",
				AI_RERANK_PROVIDER: "cohere",
			}),
		).toThrow(/COHERE_API_KEY is required/);
	});

	test("the session cookie is Secure in production unless overridden, and CORS * is refused", () => {
		const production = {
			NODE_ENV: "production",
			JWT_SECRET: "x".repeat(40),
			RESEND_API_KEY: "re_test_not_real",
			AI_API_KEY: "or",
		};
		expect(loadConfiguration(production).auth.cookie).toEqual({
			name: "synapse_refresh",
			path: "/api/v1/auth",
			secure: true,
		});
		expect(loadConfiguration({}).auth.cookie.secure).toBe(false);
		expect(
			loadConfiguration({ ...production, AUTH_COOKIE_SECURE: "false" }).auth.cookie.secure,
		).toBe(false);
		expect(() => loadConfiguration({ CORS_ORIGIN: "http://localhost:3000,*" })).toThrow(
			/CORS_ORIGIN/,
		);
	});
});
