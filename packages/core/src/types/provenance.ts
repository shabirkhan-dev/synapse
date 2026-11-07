import type { TokenUsage } from "../contracts/model-gateway";

/** What produced an answer. Every generated answer records one (architecture rule 4). */
export interface AnswerProvenance {
	/** `provider:model` of the chat model, e.g. `openrouter:openai/gpt-4o-mini`. */
	chatModel: string;
	/** `id@version` of the prompt template, e.g. `rag-answer@1`. */
	promptVersion: string;
	/** `provider:model` of the embedding model the passages were retrieved with. */
	embeddingModel: string;
	/** Chunker that produced the passages, e.g. `text-v1;size=1000;overlap=150`. */
	chunkerVersion: string;
	usage: TokenUsage;
}
