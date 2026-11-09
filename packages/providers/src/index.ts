export {
	type ChatModelHandle,
	createChatModel,
	createEmbeddingModel,
	type EmbeddingModelHandle,
} from "./models/create-models";
export {
	CHAT_PROVIDERS,
	type ChatModelSpec,
	type ChatProvider,
	EMBEDDING_PROVIDERS,
	type EmbeddingModelSpec,
	type EmbeddingProvider,
} from "./models/model-spec";
export {
	apiKeyFor,
	PROVIDER_KEY_VARIABLES,
	type ProviderCredentials,
	providerCredentials,
	type ProviderSettings,
	resolveChatModelSpec,
	resolveEmbeddingModelSpec,
} from "./models/resolve-spec";
