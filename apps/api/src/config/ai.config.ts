import type { ModelGatewayOptions } from "@synapse/adapters/model-gateway";
import { EMBEDDING_DIMENSIONS } from "@synapse/database";
import {
	type ChatModelSpec,
	providerCredentials,
	type RerankingModelSpec,
	resolveChatModelSpec,
	resolveEmbeddingModelSpec,
	resolveRerankingModelSpec,
} from "@synapse/providers";

import type { Env } from "./env";

/** Which vendor and model serve chat and embeddings (`@synapse/providers`), the fallback and the reranker. */
export type AiConfig = ModelGatewayOptions & {
	fallbackChat?: ChatModelSpec;
	rerank?: { spec: RerankingModelSpec; timeoutMs: number };
};

export function createAiConfig(env: Env): AiConfig {
	const credentials = providerCredentials(env);
	return {
		chat: resolveChatModelSpec(env.AI_CHAT_PROVIDER, env.AI_CHAT_MODEL, credentials),
		embedding: resolveEmbeddingModelSpec(
			env.AI_EMBEDDING_PROVIDER,
			env.AI_EMBEDDING_MODEL,
			credentials,
			EMBEDDING_DIMENSIONS,
		),
		...(env.AI_FALLBACK_CHAT_MODEL
			? {
					fallbackChat: resolveChatModelSpec(
						env.AI_FALLBACK_CHAT_PROVIDER ?? env.AI_CHAT_PROVIDER,
						env.AI_FALLBACK_CHAT_MODEL,
						credentials,
					),
				}
			: {}),
		...(env.AI_RERANK_PROVIDER
			? {
					rerank: {
						spec: resolveRerankingModelSpec(
							env.AI_RERANK_PROVIDER,
							env.AI_RERANK_MODEL,
							credentials,
						),
						timeoutMs: env.AI_RERANK_TIMEOUT_MS,
					},
				}
			: {}),
	};
}
