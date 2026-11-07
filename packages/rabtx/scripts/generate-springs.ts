import { readFileSync, writeFileSync } from "node:fs";
import { SPRINGS, solveSpring } from "../src/motion/springs";

const THEME = new URL("../src/styles/theme.css", import.meta.url);

/** Every spring as CSS variables: `--spring-<name>` is the easing, `--spring-<name>-duration` its length. */
export function springVars(): Record<string, string> {
	return Object.fromEntries(
		Object.entries(SPRINGS).flatMap(([name, spring]) => {
			const { easing, settleMs } = solveSpring(spring);
			return [
				[`spring-${name}`, easing],
				[`spring-${name}-duration`, `${settleMs}ms`],
			];
		}),
	);
}

function between(css: string, marker: string, body: string[]): string {
	const start = css.indexOf(`/* ${marker}:start`);
	const end = css.indexOf(`/* ${marker}:end */`);
	if (start < 0 || end < 0) throw new Error(`theme.css has no ${marker} markers`);
	const head = css.slice(0, css.indexOf("*/", start) + 2);
	const indent = css.slice(css.lastIndexOf("\n", end) + 1, end);
	return `${head}\n${body.map((line) => `${indent}${line}`).join("\n")}\n${indent}${css.slice(end)}`;
}

/** theme.css with its two generated blocks (the variables and their Tailwind `ease-*` names) filled in. */
export function themeWithSprings(css = readFileSync(THEME, "utf8")): string {
	const vars = Object.entries(springVars()).map(([name, value]) => `\t--${name}: ${value};`);
	const eases = Object.keys(SPRINGS).map((name) => `--ease-spring-${name}: var(--spring-${name});`);
	const withVars = between(css, "springs", [":root,", ".rabtx {", ...vars, "}"]);
	return between(withVars, "springs-theme", eases);
}

if (import.meta.main) {
	writeFileSync(THEME, themeWithSprings());
	console.log(`wrote ${THEME.pathname}`);
}
