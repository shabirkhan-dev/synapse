import type { CallOptions, ModelInfo } from "./model-gateway";

export interface RerankRequest extends CallOptions {
	query: string;
	documents: string[];
	/** Return at most this many, best first. */
	topN: number;
}

export interface RerankedDocument {
	/** Position of the document in `documents`. */
	index: number;
	/** Relevance from the reranking model, higher is better (not comparable across models). */
	score: number;
}

/**
 * Second-stage ranking of retrieved passages. Implemented in `@synapse/adapters/model-gateway`
 * (Cohere via `@synapse/providers`, or the offline term-overlap reranker for evaluations).
 */
export interface Reranker {
	readonly info: ModelInfo;
	rerank(request: RerankRequest): Promise<RerankedDocument[]>;
}
