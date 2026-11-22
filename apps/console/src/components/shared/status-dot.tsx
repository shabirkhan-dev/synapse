import { Badge } from "@synapse/ui/components/badge";

export type StatusTone = "ok" | "wait" | "bad";

const TONE_VARIANT = { ok: "success", wait: "warning", bad: "destructive" } as const;

/** A state as a tinted badge with a dot (fintrack's Paid / Pending / Overdue); the label carries it. */
export function StatusDot({ tone, children }: { tone: StatusTone; children: string }) {
	return (
		<Badge variant={TONE_VARIANT[tone]}>
			<span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
			{children}
		</Badge>
	);
}
