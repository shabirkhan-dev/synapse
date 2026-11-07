import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModel, LanguageModel } from "ai";

import type { Env } from "@/config/env";

export type AiModels = {
	chat: LanguageModel;
	embedding: EmbeddingModel;
};

/**
 * One OpenAI-compatible provider, configured from env. Defaults follow apps/docs (OpenRouter);
 * point AI_BASE_URL at OpenAI, Together, Groq, Ollama (http://localhost:11434/v1), LiteLLM, etc.
 * Embeddings can use a different endpoint (AI_EMBEDDING_BASE_URL / AI_EMBEDDING_API_KEY).
 */
export function createAiModels(env: Env): AiModels {
	const chatProvider = createOpenAICompatible({
		name: env.AI_PROVIDER_NAME,
		baseURL: env.AI_BASE_URL,
		...(env.AI_API_KEY ? { apiKey: env.AI_API_KEY } : {}),
		includeUsage: true,
	});
	const embeddingKey = env.AI_EMBEDDING_API_KEY ?? env.AI_API_KEY;
	const embeddingProvider = env.AI_EMBEDDING_BASE_URL
		? createOpenAICompatible({
				name: `${env.AI_PROVIDER_NAME}-embeddings`,
				baseURL: env.AI_EMBEDDING_BASE_URL,
				...(embeddingKey ? { apiKey: embeddingKey } : {}),
			})
		: chatProvider;

	return {
		chat: chatProvider.chatModel(env.AI_CHAT_MODEL),
		embedding: embeddingProvider.embeddingModel(env.AI_EMBEDDING_MODEL),
	};
}
