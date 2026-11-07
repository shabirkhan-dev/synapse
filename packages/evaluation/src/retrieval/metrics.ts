/** Keep the first occurrence of each id (chunks of one document collapse to that document). */
export function uniqueInOrder(ids: string[]): string[] {
	return [...new Set(ids)];
}

/** Share of relevant ids found in the first `k` retrieved. 1 when nothing is relevant. */
export function recallAtK(retrieved: string[], relevant: string[], k: number): number {
	if (relevant.length === 0) return 1;
	const top = new Set(uniqueInOrder(retrieved).slice(0, k));
	return relevant.filter((id) => top.has(id)).length / relevant.length;
}

/** 1 / rank of the first relevant id (0 when none is retrieved). Averaged over cases = MRR. */
export function reciprocalRank(retrieved: string[], relevant: string[]): number {
	const wanted = new Set(relevant);
	const rank = uniqueInOrder(retrieved).findIndex((id) => wanted.has(id));
	return rank === -1 ? 0 : 1 / (rank + 1);
}

export function mean(values: number[]): number {
	return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}
