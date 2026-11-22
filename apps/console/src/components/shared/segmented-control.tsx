"use client";

import { cn } from "@synapse/ui/lib/utils";

export type SegmentedOption<T> = { value: T; label: string };

export type SegmentedControlProps<T> = {
	/** What the options choose, for assistive tech (e.g. "Time range"). */
	label: string;
	options: ReadonlyArray<SegmentedOption<T>>;
	value: T;
	onChange: (value: T) => void;
};

/**
 * One choice out of a few, side by side on a track; the chosen one is raised. Each option is a
 * toggle button (`aria-pressed`), so it reads as "Top 3, toggle button, pressed".
 */
export function SegmentedControl<T extends string | number>({
	label,
	options,
	value,
	onChange,
}: SegmentedControlProps<T>) {
	return (
		<div role="group" aria-label={label} className="inline-flex h-9 rounded-[10px] bg-muted p-0.5">
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					aria-pressed={option.value === value}
					onClick={() => onChange(option.value)}
					className={cn(
						"h-full rounded-lg px-2.5 text-[0.8125rem] font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color,box-shadow] duration-150 outline-none sm:px-3 sm:text-sm",
						"hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25",
						"aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-control",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
