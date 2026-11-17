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
		<div role="group" aria-label={label} className="inline-flex rounded-lg bg-muted p-0.5">
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					aria-pressed={option.value === value}
					onClick={() => onChange(option.value)}
					className={cn(
						"h-8 rounded-md px-2 text-[0.8125rem] font-medium whitespace-nowrap sm:px-3 sm:text-sm text-muted-foreground transition-colors outline-none",
						"hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
						"aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs dark:aria-pressed:bg-white/10",
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
