import type { Env } from "./env";

export type AiConfig = {
	providerName: string;
	baseUrl: string;
	apiKey?: string;
	chatModel: string;
	embedding: {
		model: string;
		/** Separate endpoint for embeddings; falls back to `baseUrl`. */
		baseUrl?: string;
		/** Falls back to `apiKey`. */
		apiKey?: string;
	};
};

export function createAiConfig(env: Env): AiConfig {
	const embeddingApiKey = env.AI_EMBEDDING_API_KEY ?? env.AI_API_KEY;
	return {
		providerName: env.AI_PROVIDER_NAME,
		baseUrl: env.AI_BASE_URL,
		...(env.AI_API_KEY ? { apiKey: env.AI_API_KEY } : {}),
		chatModel: env.AI_CHAT_MODEL,
		embedding: {
			model: env.AI_EMBEDDING_MODEL,
			...(env.AI_EMBEDDING_BASE_URL ? { baseUrl: env.AI_EMBEDDING_BASE_URL } : {}),
			...(embeddingApiKey ? { apiKey: embeddingApiKey } : {}),
		},
	};
}
