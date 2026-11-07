import type { RetrievalMetrics, RetrievalReport } from "../retrieval/evaluate-retrieval";

export type RetrievalBaseline = Pick<RetrievalReport, "dataset" | "k" | "setup" | "metrics">;

export type MetricDelta = {
	metric: keyof RetrievalMetrics;
	baseline: number;
	actual: number;
	delta: number;
};

export type BaselineComparison = {
	passed: boolean;
	/** Metrics that dropped by more than the tolerance. */
	regressions: MetricDelta[];
	deltas: MetricDelta[];
};

/** Baseline file name for a report: `retrieval-seed@1.hashing-bow-v1.hybrid.k3.json`. */
export function baselineName({
	dataset,
	setup,
	k,
}: Pick<RetrievalReport, "dataset" | "setup" | "k">) {
	const parts = Object.values(setup).map((value) =>
		value.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
	);
	return `${dataset.name}@${dataset.version}.${parts.join(".")}.k${k}.json`;
}

export function toBaseline({ dataset, k, setup, metrics }: RetrievalReport): RetrievalBaseline {
	return { dataset, k, setup, metrics };
}

/** Fail when any metric drops more than `tolerance` (absolute) below the baseline. */
export function compareToBaseline(
	report: RetrievalReport,
	baseline: RetrievalBaseline,
	tolerance = 0.02,
): BaselineComparison {
	const deltas = (Object.keys(baseline.metrics) as (keyof RetrievalMetrics)[]).map((metric) => {
		const actual = report.metrics[metric];
		const expected = baseline.metrics[metric];
		return { metric, baseline: expected, actual, delta: actual - expected };
	});
	const regressions = deltas.filter((delta) => delta.delta < -tolerance);
	return { passed: regressions.length === 0, regressions, deltas };
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

/** Plain-text summary for CI logs. */
export function formatRetrievalReport(report: RetrievalReport, comparison?: BaselineComparison) {
	const lines = [
		`${report.dataset.name}@${report.dataset.version}  k=${report.k}  ${Object.entries(report.setup)
			.map(([key, value]) => `${key}=${value}`)
			.join("  ")}`,
		`recall@${report.k} ${pct(report.metrics.recallAtK)}   MRR ${report.metrics.mrr.toFixed(3)}`,
		"",
		...report.cases.map(
			(result) =>
				`${result.recall === 1 ? "ok  " : "MISS"} ${result.id}  rr=${result.reciprocalRank.toFixed(2)}  "${result.query}" -> [${result.retrieved.join(", ")}]`,
		),
	];
	if (comparison) {
		lines.push("");
		for (const delta of comparison.deltas) {
			lines.push(
				`${delta.metric}: baseline ${delta.baseline.toFixed(3)} actual ${delta.actual.toFixed(3)} (${delta.delta >= 0 ? "+" : ""}${delta.delta.toFixed(3)})`,
			);
		}
		lines.push(comparison.passed ? "PASS: no regression" : "FAIL: regression against baseline");
	}
	return lines.join("\n");
}
