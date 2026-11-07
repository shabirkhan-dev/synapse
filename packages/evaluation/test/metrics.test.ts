import { describe, expect, test } from "bun:test";

import { mean, recallAtK, reciprocalRank, uniqueInOrder } from "../src";

describe("retrieval metrics", () => {
	test("recall@k counts relevant ids in the deduplicated top k", () => {
		expect(recallAtK(["a", "a", "b", "c"], ["b", "c"], 2)).toBe(0.5);
		expect(recallAtK(["a", "b"], ["c"], 2)).toBe(0);
		expect(recallAtK([], [], 3)).toBe(1);
	});

	test("reciprocal rank uses the first relevant hit", () => {
		expect(reciprocalRank(["x", "x", "y", "a"], ["a", "y"])).toBe(0.5);
		expect(reciprocalRank(["x"], ["a"])).toBe(0);
	});

	test("helpers", () => {
		expect(uniqueInOrder(["b", "a", "b"])).toEqual(["b", "a"]);
		expect(mean([1, 0, 0.5])).toBe(0.5);
		expect(mean([])).toBe(0);
	});
});
