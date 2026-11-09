import {
	type ChatModelSpec,
	createChatModel,
	createEmbeddingModel,
	type EmbeddingModelSpec,
} from "@synapse/providers";

import { type AiSdkModelGateway, createAiSdkModelGateway } from "./ai-sdk-model-gateway";

export type ModelGatewayOptions = { chat: ChatModelSpec; embedding: EmbeddingModelSpec };

/**
 * `ModelGateway` for any supported vendor (`@synapse/providers`): OpenAI, Anthropic, Google,
 * Cohere or an OpenAI-compatible endpoint, chosen separately for chat and embeddings.
 */
export function createModelGateway({ chat, embedding }: ModelGatewayOptions): AiSdkModelGateway {
	const chatModel = createChatModel(chat);
	const embeddingModel = createEmbeddingModel(embedding);
	return createAiSdkModelGateway({
		chatModel: chatModel.model,
		embeddingModel: embeddingModel.model,
		chatInfo: chatModel.info,
		embeddingInfo: embeddingModel.info,
	});
}
