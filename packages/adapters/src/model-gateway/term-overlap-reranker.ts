import type { Reranker } from "@synapse/core/contracts";

const words = (text: string) => new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

/**
 * Deterministic, offline reranker: score = share of the query's distinct words found in the
 * document (ties keep the input order). No network or key — for evaluations and tests of the
 * reranking step, not a stand-in for a real reranking model.
 */
export function createTermOverlapReranker(): Reranker {
	return {
		info: { provider: "offline", model: "term-overlap-v1" },
		async rerank({ query, documents, topN }) {
			const terms = words(query);
			return documents
				.map((document, index) => {
					const present = words(document);
					let hits = 0;
					for (const term of terms) if (present.has(term)) hits += 1;
					return { index, score: terms.size === 0 ? 0 : hits / terms.size };
				})
				.toSorted((a, b) => b.score - a.score || a.index - b.index)
				.slice(0, topN);
		},
	};
}
