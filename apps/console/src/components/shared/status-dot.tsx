import { cn } from "@synapse/ui/lib/utils";

export type StatusTone = "ok" | "wait" | "bad";

const TONE_CLASS: Record<StatusTone, string> = {
	ok: "bg-emerald-500",
	wait: "bg-amber-500",
	bad: "bg-destructive",
};

/** A state label with a coloured dot before it; the label carries the meaning, the dot scans fast. */
export function StatusDot({ tone, children }: { tone: StatusTone; children: string }) {
	return (
		<span className="inline-flex items-center gap-2 text-sm font-medium">
			<span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", TONE_CLASS[tone])} />
			{children}
		</span>
	);
}
