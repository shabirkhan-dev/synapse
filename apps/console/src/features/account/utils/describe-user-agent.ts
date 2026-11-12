const BROWSERS: ReadonlyArray<[RegExp, string]> = [
	[/Edg(e|A|iOS)?\//, "Edge"],
	[/OPR\//, "Opera"],
	[/Firefox\/|FxiOS\//, "Firefox"],
	[/(Headless)?Chrome\/|CriOS\//, "Chrome"],
	[/Version\/[\d.]+.*Safari\//, "Safari"],
	[/^curl\//, "curl"],
];

const SYSTEMS: ReadonlyArray<[RegExp, string]> = [
	[/iPhone|iPad|iPod/, "iOS"],
	[/Android/, "Android"],
	[/CrOS/, "ChromeOS"],
	[/Mac OS X|Macintosh/, "macOS"],
	[/Windows/, "Windows"],
	[/Linux/, "Linux"],
];

const match = (agent: string, table: ReadonlyArray<[RegExp, string]>) =>
	table.find(([pattern]) => pattern.test(agent))?.[1] ?? null;

/** "Firefox on macOS" from a `User-Agent`; a best guess, so the raw string stays available. */
export function describeUserAgent(agent: string | null): string {
	if (!agent) return "Unknown device";
	const browser = match(agent, BROWSERS);
	const system = match(agent, SYSTEMS);
	if (browser && system) return `${browser} on ${system}`;
	return browser ?? system ?? "Unknown device";
}
