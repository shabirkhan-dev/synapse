import type { Usage } from "../types/usage.types";
import { formatCompact, formatCount, formatUsd } from "../utils/format";

const plural = new Intl.PluralRules("en");
const unpriced = (count: number) =>
	plural.select(count) === "one"
		? "1 answer has no price"
		: `${formatCount(count)} answers have no price`;

/** The headline numbers for the window. */
export function UsageTiles({ totals }: { totals: Usage["totals"] }) {
	const tiles = [
		{ label: "Answers", value: formatCount(totals.answers), note: null },
		{
			label: "Input tokens",
			value: formatCompact(totals.inputTokens),
			note: formatCount(totals.inputTokens),
		},
		{
			label: "Output tokens",
			value: formatCompact(totals.outputTokens),
			note: formatCount(totals.outputTokens),
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
	return (
		<dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{tiles.map((tile) => (
				<div key={tile.label} className="flex flex-col gap-1 rounded-xl border p-4">
					<dt className="text-xs text-muted-foreground">{tile.label}</dt>
					<dd className="text-2xl font-semibold tracking-tight tabular-nums">{tile.value}</dd>
					{tile.note ? (
						<dd className="text-xs text-muted-foreground tabular-nums">{tile.note}</dd>
					) : null}
				</div>
			))}
		</dl>
	);
}
