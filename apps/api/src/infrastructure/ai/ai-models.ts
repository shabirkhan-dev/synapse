import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { EmbeddingModel, LanguageModel } from "ai";

import type { AiConfig } from "@/config";

export type AiModels = {
	chat: LanguageModel;
	embedding: EmbeddingModel;
};

/**
 * One OpenAI-compatible provider. Defaults to OpenRouter; point AI_BASE_URL at OpenAI, Together,
 * Groq, Ollama (http://localhost:11434/v1), LiteLLM, etc. Embeddings can use a different endpoint.
 * Moves to packages/adapters (model-gateway) + packages/providers when those exist (ADR-0003).
 */
export function createAiModels(config: AiConfig): AiModels {
	const chatProvider = createOpenAICompatible({
		name: config.providerName,
		baseURL: config.baseUrl,
		...(config.apiKey ? { apiKey: config.apiKey } : {}),
		includeUsage: true,
	});
	const embeddingProvider = config.embedding.baseUrl
		? createOpenAICompatible({
				name: `${config.providerName}-embeddings`,
				baseURL: config.embedding.baseUrl,
				...(config.embedding.apiKey ? { apiKey: config.embedding.apiKey } : {}),
			})
		: chatProvider;

	return {
		chat: chatProvider.chatModel(config.chatModel),
		embedding: embeddingProvider.embeddingModel(config.embedding.model),
	};
}
