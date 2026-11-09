import type { Reranker } from "@synapse/core/contracts";

import { DEFAULT_RRF_K, reciprocalRankFusion } from "../fusion/reciprocal-rank-fusion";

/** Anything a search returns: it must be identifiable and carry a relevance score. */
export type SearchMatch = { chunkId: string; score: number };

export type VectorSearchRequest = {
	ownerId: string;
	embedding: number[];
	/** Only chunks embedded with this model (plus legacy rows without one) are comparable. */
	embeddingModel: string;
	limit: number;
};

export type KeywordSearchRequest = { ownerId: string; query: string; limit: number };

/**
 * Data access supplied by the caller. Every request carries the owner, so the access filter runs
 * inside the query, never as a post-filter. Results are ordered best first.
 */
export type RetrievalPorts<TMatch extends SearchMatch> = {
	embedQuery(query: string): Promise<number[]>;
	vectorSearch(request: VectorSearchRequest): Promise<TMatch[]>;
	keywordSearch(request: KeywordSearchRequest): Promise<TMatch[]>;
};

export type RetrievalMode = "vector" | "hybrid";

/** Second stage: the best `candidates` first-stage matches are reordered by a reranking model. */
export type RerankOptions<TMatch extends SearchMatch> = {
	reranker: Reranker;
	/** The text the reranker reads for a match (e.g. the chunk content). */
	text: (match: TMatch) => string;
	/** First-stage matches sent to the reranker; at least `topK`. */
	candidates: number;
	/** Called when reranking fails; the first-stage order is returned instead. */
	onError?: (error: unknown) => void;
};

export type RetrieverOptions<TMatch extends SearchMatch> = {
	mode: RetrievalMode;
	embeddingModel: string;
	/** Hybrid only: candidates fetched per list = topK × this (default 4). */
	candidateMultiplier?: number;
	rrfK?: number;
	rerank?: RerankOptions<TMatch>;
};

export type RetrievedMatch<TMatch extends SearchMatch> = TMatch & {
	/** 1-based rank in each list that found it, and after reranking when it ran. */
	ranks: { vector?: number; keyword?: number; rerank?: number };
};

export function createRetriever<TMatch extends SearchMatch>(
	ports: RetrievalPorts<TMatch>,
	{
		mode,
		embeddingModel,
		candidateMultiplier = 4,
		rrfK = DEFAULT_RRF_K,
		rerank,
	}: RetrieverOptions<TMatch>,
) {
	/** First stage: `vector` keeps cosine scores; `hybrid` fuses vector + keyword with RRF. */
	async function firstStage(
		ownerId: string,
		query: string,
		count: number,
		topK: number,
	): Promise<RetrievedMatch<TMatch>[]> {
		const embedding = await ports.embedQuery(query);
		if (mode === "vector") {
			const matches = await ports.vectorSearch({
				ownerId,
				embedding,
				embeddingModel,
				limit: count,
			});
			return matches.map((match, index) =>
				Object.assign({}, match, { ranks: { vector: index + 1 } }),
			);
		}
		const limit = Math.max(topK * candidateMultiplier, count);
		const [vectorMatches, keywordMatches] = await Promise.all([
			ports.vectorSearch({ ownerId, embedding, embeddingModel, limit }),
			ports.keywordSearch({ ownerId, query, limit }),
		]);
		return reciprocalRankFusion([vectorMatches, keywordMatches], (match) => match.chunkId, rrfK)
			.slice(0, count)
			.map(({ item, score, ranks: [vector, keyword] }) =>
				// Fresh object per match: the inputs belong to the caller and are not mutated.
				Object.assign({}, item, {
					score,
					ranks: {
						...(vector === undefined ? {} : { vector }),
						...(keyword === undefined ? {} : { keyword }),
					},
				}),
			);
	}

	return {
		mode,
		/** `provider:model` of the configured reranker, if any. */
		reranker: rerank ? `${rerank.reranker.info.provider}:${rerank.reranker.info.model}` : null,

		/**
		 * First stage (see `firstStage`), then — when a reranker is configured — the best `candidates`
		 * are reordered by it: `score` becomes the reranker's score and `ranks.rerank` is set. If the
		 * reranker fails, the first-stage order is returned (no `ranks.rerank`).
		 */
		async retrieve({
			ownerId,
			query,
			topK,
		}: {
			ownerId: string;
			query: string;
			topK: number;
		}): Promise<RetrievedMatch<TMatch>[]> {
			const count = rerank ? Math.max(topK, rerank.candidates) : topK;
			const candidates = await firstStage(ownerId, query, count, topK);
			if (!rerank || candidates.length === 0) return candidates.slice(0, topK);
			try {
				const ranked = await rerank.reranker.rerank({
					query,
					documents: candidates.map(rerank.text),
					topN: topK,
				});
				return ranked.flatMap(({ index, score }, position) => {
					const match = candidates[index];
					return match
						? [Object.assign({}, match, { score, ranks: { ...match.ranks, rerank: position + 1 } })]
						: [];
				});
			} catch (error) {
				rerank.onError?.(error);
				return candidates.slice(0, topK);
			}
		},
	};
}

export type Retriever<TMatch extends SearchMatch> = ReturnType<typeof createRetriever<TMatch>>;
