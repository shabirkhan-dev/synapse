import type { ModeResult, SearchMode } from "../types/retrieval.types";

/** For each chunk, its 1-based position in every mode that returned it. */
export function crossRanks(
	results: ModeResult[],
): Map<string, Partial<Record<SearchMode, number>>> {
	const ranks = new Map<string, Partial<Record<SearchMode, number>>>();
	for (const result of results) {
		if (result.status !== "ok") continue;
		result.matches.forEach((match, index) => {
			ranks.set(match.chunkId, { ...ranks.get(match.chunkId), [result.mode]: index + 1 });
		});
	}
	return ranks;
}
