"use client";

import { useState } from "react";

import type { UsageDay } from "../types/usage.types";
import { formatCount, formatDay } from "../utils/format";

/**
 * Answers per day as columns (≤ 24px, 4px rounded top, 2px apart) from one baseline. Hovering a
 * day's full-height slot shows its numbers; the table below the chart holds the same data.
 */
export function DailyChart({ days }: { days: UsageDay[] }) {
	const [hovered, setHovered] = useState<number | null>(null);
	const max = Math.max(1, ...days.map((day) => day.answers));
	const shown = hovered === null ? null : days[hovered];
	const busiest = days.reduce<UsageDay | null>(
		(best, day) => (day.answers > (best?.answers ?? 0) ? day : best),
		null,
	);
	const first = days[0];
	const last = days.at(-1);

	return (
		<figure className="flex flex-col gap-2">
			<figcaption className="text-xs text-muted-foreground">
				{busiest
					? `Busiest: ${formatDay(busiest.day)} with ${formatCount(busiest.answers)} ${busiest.answers === 1 ? "answer" : "answers"}.`
					: "No answers in this window."}
			</figcaption>
			<div className="relative" aria-hidden="true">
				<div className="flex justify-between text-[0.625rem] text-muted-foreground tabular-nums">
					<span>{formatCount(max)}</span>
				</div>
				<div
					className="flex h-40 items-end gap-0.5 border-b border-border"
					onPointerLeave={() => setHovered(null)}
				>
					{days.map((day, index) => (
						<div
							key={day.day}
							className="flex h-full min-w-0 flex-1 items-end justify-center"
							onPointerEnter={() => setHovered(index)}
						>
							{day.answers > 0 ? (
								<div
									className={`w-full max-w-6 rounded-t-[4px] transition-colors duration-100 ${hovered === null || hovered === index ? "bg-primary" : "bg-primary/40"}`}
									style={{ height: `${(day.answers / max) * 100}%` }}
								/>
							) : null}
						</div>
					))}
				</div>
				<div className="mt-1 flex justify-between text-[0.625rem] text-muted-foreground">
					<span>{first ? formatDay(first.day) : ""}</span>
					<span>{last ? formatDay(last.day) : ""}</span>
				</div>
				{shown && hovered !== null ? (
					<div
						className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
						style={{
							left: `clamp(4rem, ${((hovered + 0.5) / days.length) * 100}%, calc(100% - 4rem))`,
						}}
					>
						<p className="font-medium">{formatDay(shown.day)}</p>
						<p className="tabular-nums">
							{formatCount(shown.answers)} {shown.answers === 1 ? "answer" : "answers"}
						</p>
						<p className="text-muted-foreground tabular-nums">
							{formatCount(shown.inputTokens)} in · {formatCount(shown.outputTokens)} out tokens
						</p>
					</div>
				) : null}
			</div>
			<details className="text-xs">
				<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
					Show the numbers as a table
				</summary>
				<table className="mt-2 w-full text-left">
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
					<tbody className="tabular-nums">
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
			</details>
		</figure>
	);
}
