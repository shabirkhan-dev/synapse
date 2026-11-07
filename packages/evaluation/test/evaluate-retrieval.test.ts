import { describe, expect, test } from "bun:test";

import {
	baselineName,
	compareToBaseline,
	evaluateRetrieval,
	formatRetrievalReport,
	RETRIEVAL_SEED,
	type RetrievalDataset,
	toBaseline,
} from "../src";

const dataset: RetrievalDataset = {
	name: "tiny",
	version: 1,
	documents: [],
	cases: [
		{ id: "q1", query: "alpha", relevant: ["a"] },
		{ id: "q2", query: "beta", relevant: ["b"] },
	],
};

const answers: Record<string, string[]> = { alpha: ["a", "a", "c"], beta: ["c", "b"] };

describe("evaluateRetrieval", () => {
	test("scores each case and averages", async () => {
		const report = await evaluateRetrieval({
			dataset,
			k: 1,
			setup: { mode: "test" },
			search: async (query) => answers[query] ?? [],
		});
		expect(report.cases.map((c) => [c.id, c.retrieved, c.recall, c.reciprocalRank])).toEqual([
			["q1", ["a", "c"], 1, 1],
			["q2", ["c", "b"], 0, 0.5],
		]);
		expect(report.metrics).toEqual({ recallAtK: 0.5, mrr: 0.75 });
		expect(formatRetrievalReport(report)).toContain("MISS q2");
	});
});

describe("compareToBaseline", () => {
	test("passes within tolerance and fails on a real drop", async () => {
		const report = await evaluateRetrieval({
			dataset,
			k: 2,
			setup: { embedding: "hashing:bow-v1", mode: "hybrid" },
			search: async (query) => answers[query] ?? [],
		});
		const baseline = toBaseline(report);
		expect(compareToBaseline(report, baseline).passed).toBe(true);

		const worse = { ...report, metrics: { recallAtK: 0.5, mrr: report.metrics.mrr } };
		const result = compareToBaseline(worse, baseline);
		expect(result.passed).toBe(false);
		expect(result.regressions.map((r) => r.metric)).toEqual(["recallAtK"]);
		expect(formatRetrievalReport(worse, result)).toContain("FAIL");
		expect(baselineName(report)).toBe("tiny@1.hashing-bow-v1.hybrid.k2.json");
	});
});

describe("seed dataset", () => {
	test("every case points at documents that exist", () => {
		const ids = new Set(RETRIEVAL_SEED.documents.map((d) => d.id));
		for (const item of RETRIEVAL_SEED.cases) {
			expect(item.relevant.every((id) => ids.has(id))).toBe(true);
		}
		expect(new Set(RETRIEVAL_SEED.cases.map((c) => c.id)).size).toBe(RETRIEVAL_SEED.cases.length);
	});
});
