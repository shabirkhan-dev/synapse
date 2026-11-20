import type { Reranker } from "@synapse/core/contracts";

import { DEFAULT_RRF_K, reciprocalRankFusion } from "../fusion/reciprocal-rank-fusion";

/** Anything a search returns: it must be identifiable and carry a relevance score. */
export type SearchMatch = { chunkId: string; score: number };

/**
 * Who is searching, for per-document access inside the owner (ADR-0008). `readsAll` (owners and
 * admins) sees every document; anyone else sees open documents, their own and those shared with
 * them. Adapters must treat a missing reader as "open documents only", never as "everything".
 */
export type DocumentReader =
	| { userId: string; readsAll: boolean }
	/** Work no user does (jobs, scripts, approved actions) reads everything of the owner. */
	| { userId: null; readsAll: true };

/** Narrows a search to chosen documents of the owner (absent = every document) and the reader. */
export type DocumentScope = { documentIds?: readonly string[]; reader?: DocumentReader };

export type VectorSearchRequest = DocumentScope & {
	ownerId: string;
	embedding: number[];
	/** Only chunks embedded with this model (plus legacy rows without one) are comparable. */
	embeddingModel: string;
	limit: number;
};

export type KeywordSearchRequest = DocumentScope & {
	ownerId: string;
	query: string;
	limit: number;
};

/**
 * Data access supplied by the caller. Every request carries the owner (and the document scope, when
 * one is chosen), so both filters run inside the query, never as a post-filter. Results are ordered
 * best first.
 */
export type RetrievalPorts<TMatch extends SearchMatch> = {
	embedQuery(query: string): Promise<number[]>;
	vectorSearch(request: VectorSearchRequest): Promise<TMatch[]>;
	keywordSearch(request: KeywordSearchRequest): Promise<TMatch[]>;
};

/** `hybrid` fuses vector + keyword (RRF); `vector` keeps cosine; `keyword` is full-text only. */
export type RetrievalMode = "vector" | "hybrid" | "keyword";

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
	/**
	 * First stage: `vector` keeps cosine scores; `keyword` keeps full-text scores and embeds
	 * nothing; `hybrid` fuses vector + keyword with RRF.
	 */
	async function firstStage(
		ownerId: string,
		query: string,
		count: number,
		topK: number,
		run: RetrievalMode,
		scope: DocumentScope,
	): Promise<RetrievedMatch<TMatch>[]> {
		if (run === "keyword") {
			const matches = await ports.keywordSearch({ ownerId, query, limit: count, ...scope });
			return matches.map((match, index) =>
				Object.assign({}, match, { ranks: { keyword: index + 1 } }),
			);
		}
		const embedding = await ports.embedQuery(query);
		if (run === "vector") {
			const matches = await ports.vectorSearch({
				ownerId,
				embedding,
				embeddingModel,
				limit: count,
				...scope,
			});
			return matches.map((match, index) =>
				Object.assign({}, match, { ranks: { vector: index + 1 } }),
			);
		}
		const limit = Math.max(topK * candidateMultiplier, count);
		const [vectorMatches, keywordMatches] = await Promise.all([
			ports.vectorSearch({ ownerId, embedding, embeddingModel, limit, ...scope }),
			ports.keywordSearch({ ownerId, query, limit, ...scope }),
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
			mode: run = mode,
			documentIds,
			reader,
		}: {
			ownerId: string;
			query: string;
			topK: number;
			/** Run this mode for one call instead of the configured one (e.g. to compare modes). */
			mode?: RetrievalMode;
			/** Search only these documents of the owner. */
			documentIds?: readonly string[];
			/** Who searches; passed to both searches, which filter by it before ranking. */
			reader?: DocumentReader;
		}): Promise<RetrievedMatch<TMatch>[]> {
			const count = rerank ? Math.max(topK, rerank.candidates) : topK;
			const scope: DocumentScope = {
				...(documentIds?.length ? { documentIds } : {}),
				...(reader ? { reader } : {}),
			};
			const candidates = await firstStage(ownerId, query, count, topK, run, scope);
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
