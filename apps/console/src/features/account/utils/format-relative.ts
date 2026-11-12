const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
	["day", 86_400_000],
	["hour", 3_600_000],
	["minute", 60_000],
];

/** "5 minutes ago", "yesterday"; under a minute is "just now". */
export function formatRelative(iso: string, now: number = Date.now()): string {
	const elapsed = new Date(iso).getTime() - now;
	for (const [unit, size] of STEPS) {
		if (Math.abs(elapsed) >= size) return relative.format(Math.round(elapsed / size), unit);
	}
	return "just now";
}
