/** How often the page asks again while it is open. */
export const REFRESH_MS = 30_000;

/** The API's circuit names, as people know the dependencies. */
export const CIRCUIT_LABELS: Record<string, string> = {
	chat: "Chat model",
	embeddings: "Embedding model",
	"chat-fallback": "Fallback chat model",
	rerank: "Reranker",
	email: "Email (Resend)",
};

/** pg-boss states, in the order a job moves through them. */
export const JOB_STATES = [
	"created",
	"retry",
	"active",
	"completed",
	"failed",
	"cancelled",
] as const;
