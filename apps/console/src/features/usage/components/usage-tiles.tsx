import { StatStrip } from "@/components/shared/stat-strip";

import type { Usage } from "../types/usage.types";
import { formatCompact, formatCount, formatUsd } from "../utils/format";

const plural = new Intl.PluralRules("en");
const unpriced = (count: number) =>
	plural.select(count) === "one"
		? "1 answer has no price"
		: `${formatCount(count)} answers have no price`;

/** The exact count, only when the compact value rounds it (12.3K → 12,345). */
const exactIfRounded = (count: number) =>
	formatCompact(count) === formatCount(count) ? null : formatCount(count);

/** The headline numbers for the window. */
export function UsageTiles({ totals, days }: { totals: Usage["totals"]; days: number }) {
	const tiles = [
		{ label: "Answers", value: formatCount(totals.answers), note: `${days} days, UTC` },
		{
			label: "Input tokens",
			value: formatCompact(totals.inputTokens),
			note: exactIfRounded(totals.inputTokens),
		},
		{
			label: "Output tokens",
			value: formatCompact(totals.outputTokens),
			note: exactIfRounded(totals.outputTokens),
		},
		{
			label: "Estimated cost",
			value: totals.costUsd === null ? "—" : formatUsd(totals.costUsd),
			note:
				totals.costUsd === null
					? "No prices set (AI_MODEL_PRICES)"
					: totals.unpricedAnswers > 0
						? unpriced(totals.unpricedAnswers)
						: null,
		},
	];
	return <StatStrip stats={tiles} />;
}
