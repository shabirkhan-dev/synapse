/** Standard RRF constant; dampens the advantage of the very top ranks. */
export const DEFAULT_RRF_K = 60;

export type FusedItem<TItem> = {
	item: TItem;
	/** Sum of 1 / (k + rank) over every list the item appears in. Higher is better. */
	score: number;
	/** 1-based rank of the item in each input list (undefined when absent). */
	ranks: (number | undefined)[];
};

/**
 * Reciprocal rank fusion: merges ranked lists without needing comparable scores.
 * Items are identified by `key`; the first occurrence's item is kept. Sorted best first; ties keep
 * the order in which items were first seen.
 */
export function reciprocalRankFusion<TItem>(
	lists: TItem[][],
	key: (item: TItem) => string,
	k = DEFAULT_RRF_K,
): FusedItem<TItem>[] {
	const fused = new Map<string, FusedItem<TItem>>();
	lists.forEach((list, listIndex) => {
		list.forEach((item, position) => {
			const id = key(item);
			const rank = position + 1;
			const entry = fused.get(id) ?? { item, score: 0, ranks: lists.map(() => undefined) };
			if (entry.ranks[listIndex] === undefined) {
				entry.ranks[listIndex] = rank;
				entry.score += 1 / (k + rank);
			}
			fused.set(id, entry);
		});
	});
	return [...fused.values()].toSorted((a, b) => b.score - a.score);
}
