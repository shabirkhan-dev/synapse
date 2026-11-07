import { readdirSync, readFileSync } from "node:fs";
import { type AtRule, type Container, type Document, parse, type Rule } from "postcss";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandBlock, isShortcut } from "./command-block";
import { CommandPanel } from "./command-panel";
import {
	type CommandItem,
	commandGroups,
	commandSections,
	fuzzyMatch,
	pushRecent,
	scoreItem,
} from "./command-search";
import { commandParts } from "./command.styles";

const css = readFileSync(new URL("../../styles/command-block.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../../styles/index.css", import.meta.url), "utf8");

const commands: CommandItem[] = [
	{ id: "home", label: "Go to Home", group: "Navigation", shortcut: ["G", "H"] },
	{ id: "settings", label: "Settings", group: "Navigation", keywords: ["preferences"] },
	{ id: "new-file", label: "New file", group: "Actions", badge: "New", shortcut: ["⌘", "N"] },
	{ id: "archive", label: "Archive project", group: "Actions", disabled: true },
	{
		id: "theme",
		label: "Change theme",
		group: "Preferences",
		items: [
			{ id: "theme-dark", label: "Dark" },
			{ id: "theme-light", label: "Light" },
		],
	},
	{ id: "team", label: "Switch team", group: "Preferences", items: async () => [] },
];

const press = (init: Partial<KeyboardEvent>) =>
	isShortcut(
		{ key: "k", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...init },
		"k",
	);

const labelsOf = (sections: ReturnType<typeof commandSections>) =>
	sections.map((section) => [section.heading, section.rows.map((row) => row.item.id)]);

describe("fuzzyMatch", () => {
	it("matches everything with an empty query and nothing with a missing letter", () => {
		expect(fuzzyMatch("Settings", "")).toEqual({ score: 0, indices: [] });
		expect(fuzzyMatch("Settings", "xyz")).toBeNull();
	});

	it("ranks an exact label over a prefix over a word start over a middle", () => {
		const exact = fuzzyMatch("New", "new")!.score;
		const prefix = fuzzyMatch("New file", "new")!.score;
		const word = fuzzyMatch("Create new file", "new")!.score;
		const middle = fuzzyMatch("Renewal", "new")!.score;
		expect(exact).toBeGreaterThan(prefix);
		expect(prefix).toBeGreaterThan(word);
		expect(word).toBeGreaterThan(middle);
	});

	it("finds initials and returns the matched positions, ignoring case and accents", () => {
		expect(fuzzyMatch("New file", "nf")?.indices).toEqual([0, 4]);
		expect(fuzzyMatch("Git Status", "gs")?.indices).toEqual([0, 4]);
		expect(fuzzyMatch("Café menu", "cafe")?.indices).toEqual([0, 1, 2, 3]);
	});

	it("does not accept letters scattered inside words", () => {
		expect(fuzzyMatch("Settings", "sg")).toBeNull();
		expect(fuzzyMatch("Archive project", "ae")).toBeNull();
	});
});

describe("scoreItem", () => {
	it("matches keywords and the path, but highlights only letters in the label", () => {
		const settings = commands[1];
		expect(scoreItem(settings, "prefer")).toEqual(expect.objectContaining({ indices: [] }));
		expect(scoreItem({ id: "d", label: "Dark" }, "theme dark", ["Change theme"])?.indices).toEqual([
			0, 1, 2, 3,
		]);
		expect(scoreItem(settings, "nothing")).toBeNull();
	});
});

describe("commandSections", () => {
	it("groups by heading in first-seen order with nothing typed", () => {
		expect(labelsOf(commandSections({ items: commands, query: "", root: true }))).toEqual([
			["Navigation", ["home", "settings"]],
			["Actions", ["new-file", "archive"]],
			["Preferences", ["theme", "team"]],
		]);
	});

	it("lists recent commands first on the first page only, skipping pages and unknown ids", () => {
		const sections = commandSections({
			items: commands,
			query: "",
			root: true,
			recent: ["theme-dark", "gone", "theme", "home"],
		});
		expect(labelsOf(sections)[0]).toEqual(["Recent", ["theme-dark", "home"]]);
		expect(sections[0].rows[0].key).toBe("recent:theme-dark");
		expect(sections[0].rows[0].parents.map((p) => p.id)).toEqual(["theme"]);
		expect(
			commandSections({ items: commands, query: "", root: false, recent: ["home"] })[0].heading,
		).toBe("Navigation");
		expect(
			commandSections({ items: commands, query: "se", root: true, recent: ["home"] })[0].heading,
		).not.toBe("Recent");
	});

	it("filters and sorts by score, and searches the pages below the first", () => {
		const found = commandSections({ items: commands, query: "dark", root: true });
		expect(labelsOf(found)).toEqual([["Change theme", ["theme-dark"]]]);
		expect(labelsOf(commandSections({ items: commands, query: "dark", root: false }))).toEqual([]);
		const settings = commandSections({ items: commands, query: "set", root: true });
		expect(settings[0].rows[0].item.id).toBe("settings");
		expect(settings[0].rows[0].match).toEqual([0, 1, 2]);
	});

	it("narrows to a scope and leaves the list alone with filter off", () => {
		expect(
			labelsOf(commandSections({ items: commands, query: "", root: true, scope: "Actions" })),
		).toEqual([["Actions", ["new-file", "archive"]]]);
		expect(
			commandSections({ items: commands, query: "zzz", root: true, filter: false }).flatMap(
				(s) => s.rows,
			),
		).toHaveLength(commands.length);
	});
});

describe("helpers", () => {
	it("lists a page's groups once each", () => {
		expect(commandGroups(commands)).toEqual(["Navigation", "Actions", "Preferences"]);
	});

	it("keeps recent ids newest first, unique and capped", () => {
		expect(pushRecent(["a", "b", "c"], "b", 3)).toEqual(["b", "a", "c"]);
		expect(pushRecent(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
		expect(pushRecent(["a"], "b", 0)).toEqual([]);
	});

	it("takes ⌘ or Ctrl plus the key, and nothing with Shift or Alt", () => {
		expect(press({ metaKey: true })).toBe(true);
		expect(press({ ctrlKey: true, key: "K" })).toBe(true);
		expect(press({})).toBe(false);
		expect(press({ ctrlKey: true, shiftKey: true })).toBe(false);
		expect(press({ metaKey: true, altKey: true })).toBe(false);
	});
});

describe("CommandPanel", () => {
	const html = renderToStaticMarkup(<CommandPanel commands={commands} />);
	const input = html.match(/<input[^>]*>/)?.[0] ?? "";

	it("is a combobox field controlling a listbox, pointing at the first enabled option", () => {
		expect(input).toContain('role="combobox"');
		expect(input).toContain('aria-expanded="true"');
		expect(input).toContain('aria-autocomplete="list"');
		const list = input.match(/aria-controls="([^"]+)"/)?.[1];
		const active = input.match(/aria-activedescendant="([^"]+)"/)?.[1];
		expect(html).toContain(`role="listbox" id="${list}"`);
		expect(html).toMatch(new RegExp(`id="${active}" role="option"[^>]*aria-selected="true"`));
		expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
	});

	it("names groups by their headings, marks disabled options, and shows badges, keys and pages", () => {
		expect(html.match(/role="group"/g)).toHaveLength(3);
		expect(html).toMatch(/aria-labelledby="[^"]+"[^>]*>.*?aria-hidden="true"[^>]*>Navigation</);
		expect(html).toMatch(/role="option"[^>]*aria-disabled="true"/);
		expect(html).toContain(">New</span>");
		expect(html).toContain('<kbd class="rx-command-kbd">⌘</kbd>');
		expect(html.match(/data-page=""/g)).toHaveLength(2);
		expect(html).toContain(`class="${commandParts.highlight}"`);
	});

	it("shows keyboard hints, a polite live region, and the empty state", () => {
		expect(html).toContain(commandParts.footer);
		expect(html).toMatch(/aria-live="polite" aria-atomic="true"/);
		const none = renderToStaticMarkup(<CommandPanel commands={commands} defaultQuery="zzzz" />);
		expect(none).toContain("No results for “zzzz”.");
		expect(none).not.toContain('role="option"');
	});

	it("shows skeleton rows while loading with nothing to list", () => {
		const loading = renderToStaticMarkup(<CommandPanel commands={[]} loading />);
		expect(loading.match(new RegExp(commandParts.skeleton, "g"))).toHaveLength(4);
		expect(loading).toContain('aria-busy="true"');
	});

	it("draws its own surface unless told not to", () => {
		expect(html).toContain("rx-surface rx-command-surface");
		expect(
			renderToStaticMarkup(<CommandPanel commands={commands} surface={false} />),
		).not.toContain("rx-surface");
	});
});

describe("CommandBlock", () => {
	const html = renderToStaticMarkup(<CommandBlock commands={commands} />);

	it("renders a trigger with the shortcut and a closed, named dialog", () => {
		expect(html).toMatch(/aria-haspopup="dialog"/);
		expect(html).toContain('aria-keyshortcuts="Meta+K Control+K"');
		expect(html).toContain(">Search…</span>");
		expect(html).toContain('<kbd class="rx-command-kbd">Ctrl</kbd>');
		expect(html).toMatch(/<dialog[^>]*class="[^"]*rx-command-dialog/);
		expect(html).not.toMatch(/<dialog[^>]* open/);
		expect(html).toContain(">Command palette</h2>");
	});

	it("drops the trigger and the hint with trigger and shortcut off", () => {
		const bare = renderToStaticMarkup(
			<CommandBlock commands={commands} trigger={false} shortcut={false} />,
		);
		expect(bare).not.toContain("aria-haspopup");
	});
});

describe("command-block.css", () => {
	it("is part of styles.css", () => {
		expect(index).toContain('@import "./command-block.css";');
	});

	it("has a rule for every class the block uses", () => {
		for (const name of Object.values(commandParts)) {
			expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
		}
	});

	it("slides the highlight by anchor positioning, with a fallback, and stops for less motion", () => {
		expect(css).toContain("anchor-scope: --_command-active");
		expect(css).toContain("@supports not (anchor-scope: all)");
		// The CLI merges @supports blocks into the first one in a project, so a base rule for the
		// highlight outside them could come later and win.
		parse(css).walkDecls("display", (decl) => {
			const rule = decl.parent as Rule;
			if (!rule.selector.includes(commandParts.highlight)) return;
			let at: Container | Document | undefined = rule.parent;
			while (at && !(at.type === "atrule" && (at as AtRule).name === "supports")) at = at.parent;
			expect(at, rule.selector).toBeDefined();
		});
		expect(css).toMatch(/@layer rx-motion \{[\s\S]*prefers-reduced-motion[\s\S]*data-motion="off"/);
		expect(css).not.toContain("!important");
		expect(css).not.toMatch(/box-shadow:\s*0 \d+px/);
	});

	it("is imported by no block file through a folder index (the registry copies files)", () => {
		for (const file of readdirSync(new URL(".", import.meta.url))) {
			if (!/\.tsx?$/.test(file)) continue;
			const code = readFileSync(new URL(file, import.meta.url), "utf8");
			for (const [, spec] of code.matchAll(/from "(\.\.\/\.\.\/[^"]+)"/g)) {
				expect(spec.split("/").length, `${file}: ${spec}`).toBe(4);
			}
		}
	});
});
