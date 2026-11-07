import { describe, expect, test } from "bun:test";

import { reciprocalRankFusion } from "../src";

const id = (item: { id: string }) => item.id;

describe("reciprocalRankFusion", () => {
	test("rewards items found by several lists", () => {
		const fused = reciprocalRankFusion(
			[
				[{ id: "a" }, { id: "b" }, { id: "c" }],
				[{ id: "c" }, { id: "d" }],
			],
			id,
		);
		expect(fused.map((f) => f.item.id)).toEqual(["c", "a", "b", "d"]);
		expect(fused[0]?.ranks).toEqual([3, 1]);
		expect(fused[0]?.score).toBeCloseTo(1 / 63 + 1 / 61, 10);
		expect(fused[3]?.ranks).toEqual([undefined, 2]);
	});

	test("counts an item once per list and keeps its first rank", () => {
		const fused = reciprocalRankFusion([[{ id: "a" }, { id: "a" }]], id);
		expect(fused).toHaveLength(1);
		expect(fused[0]?.score).toBeCloseTo(1 / 61, 10);
	});

	test("handles empty lists", () => {
		expect(reciprocalRankFusion([[], []], id)).toEqual([]);
	});
});
