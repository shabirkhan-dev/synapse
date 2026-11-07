import type { OpenAICompatibleGatewayOptions } from "@synapse/adapters/model-gateway";

import type { Env } from "./env";

/** Model gateway settings (`@synapse/adapters`). Embedding key falls back to `AI_API_KEY`. */
export type AiConfig = OpenAICompatibleGatewayOptions;

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
