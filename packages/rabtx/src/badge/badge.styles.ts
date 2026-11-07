export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "violet";

// The neutral ink is already readable, so it keeps the full tone instead of being darkened.
const tones: Record<BadgeTone, string> = {
	neutral: "[--_tone:var(--muted-foreground)] [--_ink-mix:100%]",
	accent: "[--_tone:var(--primary)]",
	success: "[--_tone:var(--success)]",
	warning: "[--_tone:var(--warning)]",
	danger: "[--_tone:var(--destructive)]",
	violet: "[--_tone:var(--violet)]",
};

/** The whole look of a Badge as Tailwind classes. React, Solid and plain HTML all use these. */
export function badgeClass(tone: BadgeTone = "neutral") {
	return `rx-tint inline-flex h-5 shrink-0 items-center gap-1 rounded-(--radius-badge) px-1.5 text-xs/4 font-[510] tracking-[-0.15px] whitespace-nowrap ${tones[tone]}`;
}

/** The optional dot before the label. It takes the ink color. */
export const badgeParts = { dot: "size-1.5 shrink-0 rounded-full bg-current" };
