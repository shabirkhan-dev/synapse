import { cn } from "@synapse/ui/lib/utils";
import type { ReactNode } from "react";

export type Stat = {
	label: string;
	/** The headline figure, already formatted. */
	value: ReactNode;
	/** One quiet line under the figure (a period, an exact count, why it is empty). */
	note?: ReactNode;
};

/**
 * Headline numbers side by side in one card, split by thin rules: a sans label, the figure in mono,
 * a mono footnote (the references' KPI row). Two columns on narrow screens, one row on wide.
 */
export function StatStrip({
	stats,
	words = false,
	className,
}: {
	stats: Stat[];
	/** The figures are words ("Reachable"), set in the sans face rather than mono. */
	words?: boolean;
	className?: string;
}) {
	return (
		<dl
			className={cn(
				"grid grid-cols-2 overflow-hidden rounded-2xl border bg-card shadow-card",
				stats.length >= 4 ? "lg:grid-cols-4" : stats.length === 3 ? "lg:grid-cols-3" : "",
				className,
			)}
		>
			{stats.map((stat, index) => (
				<div
					key={stat.label}
					className={cn(
						"flex min-w-0 flex-col gap-3 p-5 lg:p-6",
						// Rules between neighbours: a column rule, and a row rule below the first two on phones.
						index % 2 === 1 ? "border-s" : "",
						index >= 2 ? "border-t lg:border-t-0" : "",
						index >= 2 && index % 2 === 0 ? "lg:border-s" : "",
					)}
				>
					<dt className="text-sm text-muted-foreground">{stat.label}</dt>
					<dd
						className={cn(
							"truncate leading-none font-medium tracking-tight tabular-nums",
							words ? "text-xl" : "font-mono text-[1.75rem]",
						)}
					>
						{stat.value}
					</dd>
					{stat.note ? (
						<dd className="font-mono text-xs text-pretty text-muted-foreground tabular-nums">
							{stat.note}
						</dd>
					) : null}
				</div>
			))}
		</dl>
	);
}
