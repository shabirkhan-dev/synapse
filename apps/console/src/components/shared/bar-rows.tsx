import { cn } from "@synapse/ui/lib/utils";

export type BarRow = { label: string; value: number; display?: string };

/** Fixed order: each row keeps its colour whatever the values (colour follows the entity). */
const TONES = ["bg-chart-2", "bg-chart-1", "bg-chart-3", "bg-chart-4", "bg-chart-5"] as const;

/**
 * Parts of a whole as horizontal bars (the references' "Leads by status"): a mono label, a rounded
 * bar against a quiet track, the count in mono. The label and the number carry the data; the
 * colour only tells rows apart.
 */
export function BarRows({
	rows,
	label,
	className,
}: {
	rows: BarRow[];
	/** What the rows are, for assistive tech (e.g. "Answers by source"). */
	label: string;
	className?: string;
}) {
	const max = Math.max(1, ...rows.map((row) => row.value));
	return (
		<ul aria-label={label} className={cn("flex flex-col gap-3", className)}>
			{rows.map((row, index) => (
				<li
					key={row.label}
					className="grid grid-cols-[minmax(5.5rem,8rem)_1fr_auto] items-center gap-4"
				>
					<span className="truncate font-mono text-xs tracking-[0.06em] text-muted-foreground uppercase">
						{row.label}
					</span>
					<span className="h-3 overflow-hidden rounded-full bg-chart-muted" aria-hidden="true">
						<span
							className={cn("block h-full rounded-full", TONES[Math.min(index, TONES.length - 1)])}
							style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
						/>
					</span>
					<span className="min-w-10 text-end font-mono text-sm tabular-nums">
						{row.display ?? row.value}
					</span>
				</li>
			))}
		</ul>
	);
}
