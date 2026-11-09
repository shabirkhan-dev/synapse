/** Vendors a chat model can come from. `openai-compatible` covers OpenRouter, Groq, Ollama, LiteLLM… */
export const CHAT_PROVIDERS = [
	"openai-compatible",
	"openai",
	"anthropic",
	"google",
	"cohere",
] as const;
/** Vendors with embedding models (Anthropic has none). */
export const EMBEDDING_PROVIDERS = ["openai-compatible", "openai", "google", "cohere"] as const;

/** Vendors with reranking models. */
export const RERANK_PROVIDERS = ["cohere"] as const;

export type ChatProvider = (typeof CHAT_PROVIDERS)[number];
export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];
export type RerankProvider = (typeof RERANK_PROVIDERS)[number];

type Connection = {
	apiKey?: string;
	/** Override the vendor's default endpoint (proxies, regional endpoints). */
	baseUrl?: string;
	/** Injected for tests. */
	fetch?: typeof fetch;
};

/** For `openai-compatible`: a name recorded in provenance (e.g. `openrouter`) and its endpoint. */
type CompatibleConnection = Connection & { name: string; baseUrl: string };

export type ChatModelSpec =
	| ({ provider: "openai-compatible"; model: string } & CompatibleConnection)
	| ({ provider: Exclude<ChatProvider, "openai-compatible">; model: string } & Connection);

export type EmbeddingModelSpec = (
	| ({ provider: "openai-compatible"; model: string } & CompatibleConnection)
	| ({ provider: Exclude<EmbeddingProvider, "openai-compatible">; model: string } & Connection)
) & {
	/** Vector size to request where the vendor supports it (must match the pgvector column). */
	dimensions?: number;
};

export type RerankingModelSpec = { provider: RerankProvider; model: string } & Connection;
