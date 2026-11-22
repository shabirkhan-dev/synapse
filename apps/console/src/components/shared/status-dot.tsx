import { cn } from "@synapse/ui/lib/utils";

export type StatusTone = "ok" | "wait" | "bad";

/** Tinted pills (the references' "Paid", "Overdue"): text 4.5:1+ on its tint in both themes. */
const TONE_CLASS: Record<StatusTone, string> = {
	ok: "bg-success/10 text-success",
	wait: "bg-warning/10 text-warning",
	bad: "bg-destructive/10 text-red-800 dark:text-destructive",
};

/** A state as a tinted pill with a dot; the label carries the meaning, the colour scans fast. */
export function StatusDot({ tone, children }: { tone: StatusTone; children: string }) {
	return (
		<span
			className={cn(
				"inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium",
				TONE_CLASS[tone],
			)}
		>
			<span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
			{children}
		</span>
	);
}
