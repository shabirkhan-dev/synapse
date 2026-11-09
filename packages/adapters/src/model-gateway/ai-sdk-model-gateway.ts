import type { ModelGateway, ModelInfo } from "@synapse/core/contracts";
import { embed, embedMany, type EmbeddingModel, generateText, type LanguageModel } from "ai";

/**
 * `ModelGateway` on top of AI SDK models. Also exposes the raw `chatModel` for callers that need
 * AI SDK features the contract does not cover yet (streaming tool-calling chat in apps/api).
 * Gateway calls make one attempt (`maxRetries: 0`): retries belong to `@synapse/reliability`.
 */
export type AiSdkModelGateway = ModelGateway & {
	chatModel: LanguageModel;
};

export type AiSdkModelGatewayOptions = {
	chatModel: LanguageModel;
	embeddingModel: EmbeddingModel;
	chatInfo: ModelInfo;
	embeddingInfo: ModelInfo;
};

export function createAiSdkModelGateway({
	chatModel,
	embeddingModel,
	chatInfo,
	embeddingInfo,
}: AiSdkModelGatewayOptions): AiSdkModelGateway {
	return {
		chatModel,
		chat: {
			info: chatInfo,
			async generateText({ system, prompt, abortSignal }) {
				const result = await generateText({
					model: chatModel,
					prompt,
					maxRetries: 0,
					...(system ? { system } : {}),
					...(abortSignal ? { abortSignal } : {}),
				});
				return {
					text: result.text,
					model: chatInfo,
					usage: {
						...(result.usage.inputTokens === undefined
							? {}
							: { inputTokens: result.usage.inputTokens }),
						...(result.usage.outputTokens === undefined
							? {}
							: { outputTokens: result.usage.outputTokens }),
					},
				};
			},
		},
		embedding: {
			info: embeddingInfo,
			async embed(value, options = {}) {
				const { embedding } = await embed({
					model: embeddingModel,
					value,
					maxRetries: 0,
					...options,
				});
				return embedding;
			},
			async embedMany(values, options = {}) {
				const { embeddings } = await embedMany({
					model: embeddingModel,
					values,
					maxRetries: 0,
					...options,
				});
				return embeddings;
			},
		},
	};
}
