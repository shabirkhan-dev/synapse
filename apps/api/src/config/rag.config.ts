import type { Env } from "./env";

export type RagConfig = {
	chunk: { size: number; overlap: number };
	topK: number;
	/** Deadline for reading one uploaded PDF (in a worker thread). */
	pdfTimeoutMs: number;
	/** Reading a web page by URL; private networks only in development and tests. */
	web: { timeoutMs: number; allowPrivateNetworks: boolean };
	searchMode: Env["RAG_SEARCH_MODE"];
	maxContextTokens: number;
	/** First-stage matches sent to the reranker, when one is configured. */
	rerankCandidates: number;
	/** Max tool-calling steps per chat turn. */
	chatMaxSteps: number;
	/** How much stored conversation history goes back to the model. */
	chatHistory: { maxTokens: number; maxMessages: number };
};

export function createRagConfig(env: Env): RagConfig {
	return {
		chunk: { size: env.RAG_CHUNK_SIZE, overlap: env.RAG_CHUNK_OVERLAP },
		topK: env.RAG_TOP_K,
		pdfTimeoutMs: env.RAG_PDF_TIMEOUT_MS,
		web: {
			timeoutMs: env.RAG_WEB_TIMEOUT_MS,
			allowPrivateNetworks: env.RAG_WEB_ALLOW_PRIVATE_NETWORKS === "true",
		},
		searchMode: env.RAG_SEARCH_MODE,
		maxContextTokens: env.RAG_MAX_CONTEXT_TOKENS,
		rerankCandidates: env.RAG_RERANK_CANDIDATES,
		chatMaxSteps: env.CHAT_MAX_STEPS,
		chatHistory: {
			maxTokens: env.CHAT_HISTORY_MAX_TOKENS,
			maxMessages: env.CHAT_HISTORY_MAX_MESSAGES,
		},
	};
}
