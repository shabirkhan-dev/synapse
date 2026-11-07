import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = new URL("..", import.meta.url).pathname;
const theme = readFileSync(join(src, "styles/theme.css"), "utf8");

/** Every file a component's look comes from: its CSS and its Tailwind class strings. */
function sources(dir = src): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sources(path);
		if (/\.test\.tsx?$/.test(entry.name) || entry.name === "theme.css") return [];
		return /\.(css|tsx?)$/.test(entry.name) ? [path] : [];
	});
}

/** The variables declared in one block of theme.css, by its selector. */
function block(selector: string): Set<string> {
	const start = theme.indexOf(`${selector} {`);
	const body = theme.slice(start, theme.indexOf("\n}", start));
	return new Set([...body.matchAll(/^\s*--([\w-]+):/gm)].map((m) => m[1]));
}

const light = block(":root,\n.rabtx");
const dark = block(".dark,\n.rabtx.dark,\n.dark .rabtx:not(.light)");
// The theme is declared in two `:root, .rabtx` blocks: the tokens, then the generated springs.
const springs = new Set(
	[...theme.slice(theme.indexOf("springs:start")).matchAll(/^\s*--(spring-[\w-]+):/gm)].map(
		(m) => m[1],
	),
);

describe("theme.css", () => {
	it("follows shadcn's token names", () => {
		for (const name of [
			"background",
			"foreground",
			"card",
			"card-foreground",
			"popover",
			"popover-foreground",
			"primary",
			"primary-foreground",
			"secondary",
			"secondary-foreground",
			"muted",
			"muted-foreground",
			"accent",
			"accent-foreground",
			"destructive",
			"border",
			"input",
			"ring",
			"chart-1",
			"chart-5",
			"sidebar",
			"sidebar-ring",
			"radius",
		]) {
			expect(light, name).toContain(name);
		}
	});

	it("gives every light color a dark value", () => {
		const colors = [...light].filter((name) => !/^(radius|font|shadow|motion)/.test(name));
		for (const name of colors) expect(dark, name).toContain(name);
	});

	it("maps the colors into Tailwind with @theme inline", () => {
		expect(theme).toContain("@theme inline {");
		expect(theme).toContain("--color-primary: var(--primary);");
		expect(theme).toContain("--ease-spring-press: var(--spring-press);");
	});
});

describe("components", () => {
	const files = sources();

	it("read only theme tokens (anything else is a private --_ variable)", () => {
		for (const file of files) {
			const text = readFileSync(file, "utf8");
			const used = [...text.matchAll(/(?:var\(|\(|\[)--([a-z][\w-]*)/g)].map((m) => m[1]);
			for (const name of used) {
				expect(light.has(name) || springs.has(name), `${file}: --${name}`).toBe(true);
			}
		}
	});

	it("have no rabtx-prefixed tokens left", () => {
		for (const file of files) expect(readFileSync(file, "utf8"), file).not.toMatch(/--rx-/);
	});
});
