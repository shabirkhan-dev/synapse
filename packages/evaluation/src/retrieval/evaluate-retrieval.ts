import type { RetrievalDataset } from "../datasets/retrieval-dataset";
import { mean, recallAtK, reciprocalRank, uniqueInOrder } from "./metrics";

export type RetrievalMetrics = {
	/** Mean recall@k over all cases. */
	recallAtK: number;
	/** Mean reciprocal rank. */
	mrr: number;
};

export type RetrievalCaseResult = {
	id: string;
	query: string;
	relevant: string[];
	/** Dataset document ids, best first, deduplicated. */
	retrieved: string[];
	recall: number;
	reciprocalRank: number;
};

export type RetrievalReport = {
	dataset: { name: string; version: number };
	k: number;
	/** What was evaluated, e.g. `{ embedding: "hashing:bow-v1", mode: "hybrid" }`. */
	setup: Record<string, string>;
	metrics: RetrievalMetrics;
	cases: RetrievalCaseResult[];
};

export type RetrievalEvaluationOptions = {
	dataset: RetrievalDataset;
	k: number;
	setup: Record<string, string>;
	/** Return dataset document ids for a query, best first (duplicates allowed). */
	search(query: string): Promise<string[]>;
};

/** Run every case through `search` (in parallel) and score recall@k and MRR; order is kept. */
export async function evaluateRetrieval({
	dataset,
	k,
	setup,
	search,
}: RetrievalEvaluationOptions): Promise<RetrievalReport> {
	const cases = await Promise.all(
		dataset.cases.map(async (item): Promise<RetrievalCaseResult> => {
			const retrieved = uniqueInOrder(await search(item.query));
			return {
				id: item.id,
				query: item.query,
				relevant: item.relevant,
				retrieved,
				recall: recallAtK(retrieved, item.relevant, k),
				reciprocalRank: reciprocalRank(retrieved, item.relevant),
			};
		}),
	);
	return {
		dataset: { name: dataset.name, version: dataset.version },
		k,
		setup,
		metrics: {
			recallAtK: mean(cases.map((result) => result.recall)),
			mrr: mean(cases.map((result) => result.reciprocalRank)),
		},
		cases,
	};
}
