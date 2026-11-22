import { cn } from "@synapse/ui/lib/utils";

/**
 * A share as a row of thin ticks, the filled part in sky blue (the references' "task completion
 * rate"). Decorative: the number beside it carries the value.
 */
export function TickMeter({
	value,
	ticks = 24,
	className,
}: {
	/** 0–1. */
	value: number;
	ticks?: number;
	className?: string;
}) {
	const filled = Math.round(Math.min(1, Math.max(0, value)) * ticks);
	return (
		<span aria-hidden="true" className={cn("flex h-5 items-stretch gap-[3px]", className)}>
			{Array.from({ length: ticks }, (_, index) => (
				<span
					// oxlint-disable-next-line react/no-array-index-key -- ticks have no identity but their place
					key={index}
					className={cn("w-[3px] rounded-full", index < filled ? "bg-chart-2" : "bg-chart-muted")}
				/>
			))}
		</span>
	);
}
