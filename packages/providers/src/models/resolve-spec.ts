import type {
	ChatModelSpec,
	ChatProvider,
	EmbeddingModelSpec,
	EmbeddingProvider,
	RerankingModelSpec,
	RerankProvider,
} from "./model-spec";

/** Everything an app knows about its model vendors, read from its config. */
export type ProviderCredentials = {
	/** The OpenAI-compatible endpoint (OpenRouter by default), with an optional embeddings endpoint. */
	openaiCompatible: {
		name: string;
		baseUrl: string;
		apiKey?: string;
		embeddingBaseUrl?: string;
		embeddingApiKey?: string;
	};
	openaiApiKey?: string;
	anthropicApiKey?: string;
	googleApiKey?: string;
	cohereApiKey?: string;
};

/** The API key a vendor will be called with, or `undefined` when none is configured. */
export function apiKeyFor(
	provider: ChatProvider,
	credentials: ProviderCredentials,
	use: "chat" | "embedding" = "chat",
): string | undefined {
	switch (provider) {
		case "openai-compatible":
			return use === "embedding"
				? (credentials.openaiCompatible.embeddingApiKey ?? credentials.openaiCompatible.apiKey)
				: credentials.openaiCompatible.apiKey;
		case "openai":
			return credentials.openaiApiKey;
		case "anthropic":
			return credentials.anthropicApiKey;
		case "google":
			return credentials.googleApiKey;
		case "cohere":
			return credentials.cohereApiKey;
	}
}

/** The environment variable each app reads a vendor's key from (named in config errors). */
export const PROVIDER_KEY_VARIABLES = {
	"openai-compatible": "AI_API_KEY",
	openai: "OPENAI_API_KEY",
	anthropic: "ANTHROPIC_API_KEY",
	google: "GOOGLE_GENERATIVE_AI_API_KEY",
	cohere: "COHERE_API_KEY",
} as const satisfies Record<ChatProvider, string>;

/** The provider settings an app has parsed from its environment (same names as the variables). */
export type ProviderSettings = {
	AI_PROVIDER_NAME: string;
	AI_BASE_URL: string;
	AI_API_KEY?: string | undefined;
	AI_EMBEDDING_BASE_URL?: string | undefined;
	AI_EMBEDDING_API_KEY?: string | undefined;
	OPENAI_API_KEY?: string | undefined;
	ANTHROPIC_API_KEY?: string | undefined;
	GOOGLE_GENERATIVE_AI_API_KEY?: string | undefined;
	COHERE_API_KEY?: string | undefined;
};

const optional = <K extends string>(key: K, value: string | undefined) =>
	value ? ({ [key]: value } as Record<K, string>) : {};

/** Credentials from already-parsed settings (the apps' config validates them first). */
export function providerCredentials(settings: ProviderSettings): ProviderCredentials {
	return {
		openaiCompatible: {
			name: settings.AI_PROVIDER_NAME,
			baseUrl: settings.AI_BASE_URL,
			...optional("apiKey", settings.AI_API_KEY),
			...optional("embeddingBaseUrl", settings.AI_EMBEDDING_BASE_URL),
			...optional("embeddingApiKey", settings.AI_EMBEDDING_API_KEY),
		},
		...optional("openaiApiKey", settings.OPENAI_API_KEY),
		...optional("anthropicApiKey", settings.ANTHROPIC_API_KEY),
		...optional("googleApiKey", settings.GOOGLE_GENERATIVE_AI_API_KEY),
		...optional("cohereApiKey", settings.COHERE_API_KEY),
	};
}

const withKey = (apiKey: string | undefined) => (apiKey ? { apiKey } : {});

export function resolveChatModelSpec(
	provider: ChatProvider,
	model: string,
	credentials: ProviderCredentials,
): ChatModelSpec {
	const apiKey = withKey(apiKeyFor(provider, credentials));
	if (provider !== "openai-compatible") return { provider, model, ...apiKey };
	const { name, baseUrl } = credentials.openaiCompatible;
	return { provider, name, baseUrl, model, ...apiKey };
}

/**
 * A separate OpenAI-compatible embeddings endpoint is recorded as `<name>-embeddings`, so its
 * vectors are versioned apart from the chat endpoint's.
 */
export function resolveEmbeddingModelSpec(
	provider: EmbeddingProvider,
	model: string,
	credentials: ProviderCredentials,
	dimensions: number,
): EmbeddingModelSpec {
	const apiKey = withKey(apiKeyFor(provider, credentials, "embedding"));
	if (provider !== "openai-compatible") return { provider, model, dimensions, ...apiKey };
	const { name, baseUrl, embeddingBaseUrl } = credentials.openaiCompatible;
	return embeddingBaseUrl
		? {
				provider,
				name: `${name}-embeddings`,
				baseUrl: embeddingBaseUrl,
				model,
				dimensions,
				...apiKey,
			}
		: { provider, name, baseUrl, model, dimensions, ...apiKey };
}

export function resolveRerankingModelSpec(
	provider: RerankProvider,
	model: string,
	credentials: ProviderCredentials,
): RerankingModelSpec {
	return { provider, model, ...withKey(apiKeyFor(provider, credentials)) };
}
