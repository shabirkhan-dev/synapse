"use client";

import { useState } from "react";

import { Disclosure } from "@/components/shared/disclosure";

import type { UsageDay } from "../types/usage.types";
import { formatCount, formatDay } from "../utils/format";

/**
 * Answers per day as rounded columns from one baseline, 2px apart (the references' revenue chart):
 * quiet bars, the busiest day (or the hovered one) in orange. Hovering a day's full-height slot
 * shows its numbers; the table below holds the same data.
 */
export function DailyChart({ days }: { days: UsageDay[] }) {
	const [hovered, setHovered] = useState<number | null>(null);
	const max = Math.max(1, ...days.map((day) => day.answers));
	const shown = hovered === null ? null : days[hovered];
	const busiest = days.reduce<number | null>(
		(best, day, index) =>
			day.answers > (best === null ? 0 : (days[best]?.answers ?? 0)) ? index : best,
		null,
	);
	const highlighted = hovered ?? busiest;
	const busiestDay = busiest === null ? null : days[busiest];
	// Every day is labelled when they fit; otherwise about six evenly spaced ones.
	const every = days.length <= 14 ? 1 : Math.ceil(days.length / 6);

	return (
		<figure className="flex flex-col gap-4">
			<figcaption className="font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase">
				{busiestDay
					? `Busiest ${formatDay(busiestDay.day)} · ${formatCount(busiestDay.answers)} ${busiestDay.answers === 1 ? "answer" : "answers"}`
					: "No answers in this window"}
			</figcaption>
			<div className="relative" aria-hidden="true">
				<div
					className="relative flex h-48 items-end gap-0.5 sm:gap-1"
					onPointerLeave={() => setHovered(null)}
				>
					{days.map((day, index) => (
						<div
							key={day.day}
							data-day={day.day}
							className="relative flex h-full min-w-0 flex-1 items-end justify-center"
							onPointerEnter={() => setHovered(index)}
						>
							<div
								className={`w-full max-w-10 rounded-[8px] border transition-colors duration-100 ${
									index === highlighted && day.answers > 0
										? "border-transparent bg-linear-to-b from-chart-1/75 to-chart-1"
										: "border-border/70 bg-chart-muted"
								}`}
								// Empty days keep a low stub so the rhythm of the days stays visible.
								style={{
									height: day.answers > 0 ? `${Math.max(6, (day.answers / max) * 100)}%` : "6%",
								}}
							/>
						</div>
					))}
				</div>
				<div className="mt-3 flex gap-0.5 sm:gap-1">
					{days.map((day, index) => (
						<span
							key={day.day}
							className="min-w-0 flex-1 text-center font-mono text-[0.6875rem] whitespace-nowrap text-muted-foreground uppercase"
						>
							{index % every === 0 ? formatDay(day.day) : ""}
						</span>
					))}
				</div>
				{shown && hovered !== null ? (
					<div
						className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
						style={{
							left: `clamp(4rem, ${((hovered + 0.5) / days.length) * 100}%, calc(100% - 4rem))`,
						}}
					>
						<p className="font-medium">{formatDay(shown.day)}</p>
						<p className="font-mono tabular-nums">
							{formatCount(shown.answers)} {shown.answers === 1 ? "answer" : "answers"}
						</p>
						<p className="font-mono text-muted-foreground tabular-nums">
							{formatCount(shown.inputTokens)} in · {formatCount(shown.outputTokens)} out
						</p>
					</div>
				) : null}
			</div>
			<Disclosure summary="Show the numbers as a table">
				<table className="w-full text-left">
					<caption className="sr-only">Answers and tokens per day</caption>
					<thead className="text-muted-foreground">
						<tr>
							<th scope="col" className="py-1 font-medium">
								Day
							</th>
							<th scope="col" className="py-1 text-right font-medium">
								Answers
							</th>
							<th scope="col" className="py-1 text-right font-medium">
								Input tokens
							</th>
							<th scope="col" className="py-1 text-right font-medium">
								Output tokens
							</th>
						</tr>
					</thead>
					<tbody className="font-mono tabular-nums">
						{days.map((day) => (
							<tr key={day.day} className="border-t">
								<th scope="row" className="py-1 font-normal">
									{formatDay(day.day)}
								</th>
								<td className="py-1 text-right">{formatCount(day.answers)}</td>
								<td className="py-1 text-right">{formatCount(day.inputTokens)}</td>
								<td className="py-1 text-right">{formatCount(day.outputTokens)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Disclosure>
		</figure>
	);
}
