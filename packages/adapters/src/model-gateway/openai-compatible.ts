import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { type AiSdkModelGateway, createAiSdkModelGateway } from "./ai-sdk-model-gateway";

export type OpenAICompatibleGatewayOptions = {
	providerName: string;
	baseUrl: string;
	apiKey?: string;
	chatModel: string;
	embedding: {
		model: string;
		/** Separate endpoint for embeddings; falls back to `baseUrl`. */
		baseUrl?: string;
		apiKey?: string;
	};
};

/**
 * One OpenAI-compatible endpoint (OpenRouter by default; also OpenAI, Together, Groq, Ollama,
 * LiteLLM…), with an optional separate embeddings endpoint.
 */
export function createOpenAICompatibleModelGateway(
	options: OpenAICompatibleGatewayOptions,
): AiSdkModelGateway {
	const chatProvider = createOpenAICompatible({
		name: options.providerName,
		baseURL: options.baseUrl,
		...(options.apiKey ? { apiKey: options.apiKey } : {}),
		includeUsage: true,
	});
	const embeddingProviderName = options.embedding.baseUrl
		? `${options.providerName}-embeddings`
		: options.providerName;
	const embeddingProvider = options.embedding.baseUrl
		? createOpenAICompatible({
				name: embeddingProviderName,
				baseURL: options.embedding.baseUrl,
				...(options.embedding.apiKey ? { apiKey: options.embedding.apiKey } : {}),
			})
		: chatProvider;

	return createAiSdkModelGateway({
		chatModel: chatProvider.chatModel(options.chatModel),
		embeddingModel: embeddingProvider.embeddingModel(options.embedding.model),
		chatInfo: { provider: options.providerName, model: options.chatModel },
		embeddingInfo: { provider: embeddingProviderName, model: options.embedding.model },
	});
}
