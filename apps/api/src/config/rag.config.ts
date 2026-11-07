import type { Env } from "./env";

export type RagConfig = {
	chunk: { size: number; overlap: number };
	topK: number;
	searchMode: Env["RAG_SEARCH_MODE"];
	maxContextTokens: number;
	/** Max tool-calling steps per chat turn. */
	chatMaxSteps: number;
};

export function createRagConfig(env: Env): RagConfig {
	return {
		chunk: { size: env.RAG_CHUNK_SIZE, overlap: env.RAG_CHUNK_OVERLAP },
		topK: env.RAG_TOP_K,
		searchMode: env.RAG_SEARCH_MODE,
		maxContextTokens: env.RAG_MAX_CONTEXT_TOKENS,
		chatMaxSteps: env.CHAT_MAX_STEPS,
	};
}
