import type { Citation } from "../context/build-context";

/** The citations an answer actually uses (`[2]`, `[1][3]`, `[1, 3]`), in order of first mention. */
export function extractCitations(answer: string, available: Citation[]): Citation[] {
	const byIndex = new Map(available.map((citation) => [citation.index, citation]));
	const used: Citation[] = [];
	for (const [, group = ""] of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
		for (const number of group.split(",")) {
			const citation = byIndex.get(Number(number.trim()));
			if (citation && !used.includes(citation)) {
				used.push(citation);
			}
		}
	}
	return used;
}
