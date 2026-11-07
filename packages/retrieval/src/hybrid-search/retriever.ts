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

export type RetrieverOptions = {
	mode: RetrievalMode;
	embeddingModel: string;
	/** Hybrid only: candidates fetched per list = topK × this (default 4). */
	candidateMultiplier?: number;
	rrfK?: number;
};

export type RetrievedMatch<TMatch extends SearchMatch> = TMatch & {
	/** 1-based rank in each list that found it. */
	ranks: { vector?: number; keyword?: number };
};

export function createRetriever<TMatch extends SearchMatch>(
	ports: RetrievalPorts<TMatch>,
	{ mode, embeddingModel, candidateMultiplier = 4, rrfK = DEFAULT_RRF_K }: RetrieverOptions,
) {
	return {
		mode,

		/**
		 * `vector`: cosine `score` from the vector search. `hybrid`: vector + keyword candidates fused
		 * with reciprocal rank fusion; `score` is the RRF score.
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
			const embedding = await ports.embedQuery(query);
			if (mode === "vector") {
				const matches = await ports.vectorSearch({
					ownerId,
					embedding,
					embeddingModel,
					limit: topK,
				});
				return matches.map((match, index) =>
					Object.assign({}, match, { ranks: { vector: index + 1 } }),
				);
			}

			const limit = topK * candidateMultiplier;
			const [vectorMatches, keywordMatches] = await Promise.all([
				ports.vectorSearch({ ownerId, embedding, embeddingModel, limit }),
				ports.keywordSearch({ ownerId, query, limit }),
			]);
			return reciprocalRankFusion([vectorMatches, keywordMatches], (match) => match.chunkId, rrfK)
				.slice(0, topK)
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
		},
	};
}

export type Retriever<TMatch extends SearchMatch> = ReturnType<typeof createRetriever<TMatch>>;
