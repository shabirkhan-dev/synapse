/**
 * Builds the shadcn registry for @rabtx/ui, so any shadcn project can install a component with
 * `npx shadcn@latest add <docs>/r/button.json` (or `@rabtx/button`) and own its source.
 *
 *   1. Stage: copy each component's source into a temporary shadcn source registry, rewriting the
 *      package's imports to shadcn aliases (`@/lib/utils`, `@/hooks/...`) and turning its CSS into the
 *      registry `css` / `cssVars` fields.
 *   2. Build: run `shadcn build` on it.
 *   3. Write the items to apps/docs/registry/r. The docs serve them at /r/<name>.json and replace
 *      `{{origin}}` with the docs URL, so dependencies resolve on localhost and in production alike.
 *
 * `--check` builds to a temporary folder and fails if the committed files are out of date (CI).
 */
import { execFileSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import postcss, {
	type AtRule,
	type ChildNode,
	type Container,
	parse,
	type Rule,
	root as cssRoot,
} from "postcss";
import nested from "postcss-nested";
import { springVars } from "./generate-springs";

const PKG = new URL("..", import.meta.url).pathname;
const SRC = join(PKG, "src");
const OUT = join(PKG, "../../apps/docs/registry/r");
const ORIGIN = "{{origin}}";
const SHADCN = join(PKG, "node_modules/.bin/shadcn");

type CssObject = { [key: string]: string | CssObject };
type File = {
	from: string;
	type: "registry:ui" | "registry:lib" | "registry:hook" | "registry:component";
	name?: string;
	/** Where the CLI writes it in a project, for block files (`components/blocks/...`). */
	target?: string;
};
type Item = {
	name: string;
	type: string;
	title: string;
	description: string;
	files?: File[];
	dependencies?: string[];
	registryDependencies?: string[];
	css?: CssObject;
	cssVars?: {
		theme?: Record<string, string>;
		light?: Record<string, string>;
		dark?: Record<string, string>;
	};
	docs?: string;
	categories?: string[];
};

// ---------------------------------------------------------------------------------------------
// CSS: nested source CSS -> the flat object shape the shadcn CLI writes into a project's CSS file.
// The CLI does not unnest, so rules are flattened first (postcss-nested bubbles @media / @supports
// out of rules) and every key is a selector or an at-rule.

function toObject(container: Container, where: string, warnings: string[]): CssObject {
	const out: CssObject = {};
	const put = (key: string, value: string | CssObject) => {
		const existing = out[key];
		if (existing === undefined) out[key] = value;
		else if (typeof existing === "object" && typeof value === "object") {
			warnings.push(`${where}: merged repeated "${key}"`);
			Object.assign(existing, value);
		} else out[key] = value;
	};
	container.each((node: ChildNode) => {
		if (node.type === "comment") return;
		if (node.type === "decl") {
			put(
				node.prop,
				`${node.value.replace(/\s+/g, " ").trim()}${node.important ? " !important" : ""}`,
			);
		} else if (node.type === "rule") {
			put((node as Rule).selectors.join(", "), toObject(node as Rule, where, warnings));
		} else if (node.type === "atrule") {
			const at = node as AtRule;
			if (at.name === "source") return;
			put(`@${at.name} ${at.params.replace(/\s+/g, " ").trim()}`, toObject(at, where, warnings));
		}
	});
	return out;
}

function cssObject(css: string, where: string, warnings: string[]): CssObject {
	const root = postcss([nested()]).process(css, { from: undefined }).root;
	return toObject(root, where, warnings);
}

const readStyle = (name: string) => readFileSync(join(SRC, "styles", name), "utf8");

/** The custom properties declared directly in the first rule matching `selector` in theme.css. */
function themeBlock(selector: string): Record<string, string> {
	const root = parse(readStyle("theme.css"));
	let vars: Record<string, string> | undefined;
	root.walkRules((rule) => {
		if (vars || rule.selectors.join(", ") !== selector) return;
		vars = {};
		rule.each((node) => {
			if (node.type === "decl" && node.prop.startsWith("--")) {
				vars![node.prop.slice(2)] = node.value.replace(/\s+/g, " ").trim();
			}
		});
	});
	if (!vars) throw new Error(`theme.css has no "${selector}" block`);
	return vars;
}

/** `@theme inline` entries in theme.css that map Rabtx-only tokens (shadcn projects have the rest). */
function themeMappings(): Record<string, string> {
	const out: Record<string, string> = {};
	parse(readStyle("theme.css")).walkAtRules("theme", (at) => {
		at.walkDecls((decl) => {
			const token = decl.value.match(/^var\(--([\w-]+)\)$/)?.[1];
			if (token && !SHADCN_TOKENS.has(token)) out[decl.prop.slice(2)] = decl.value;
		});
	});
	return out;
}

/** The selectors in theme.css that switch the radius mode, as registry CSS. */
function radiusModes(warnings: string[]): CssObject {
	const root = parse(readStyle("theme.css"));
	const modes = cssRoot();
	root.walkRules((rule) => {
		if (rule.selector.startsWith("[data-radius")) modes.append(rule.clone());
	});
	return toObject(modes, "theme.css", warnings);
}

// shadcn's own tokens: every shadcn project already defines these, so components may rely on them.
const SHADCN_TOKENS = new Set([
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
	"radius",
	"font-sans",
	"chart-1",
	"chart-2",
	"chart-3",
	"chart-4",
	"chart-5",
	"sidebar",
	"sidebar-foreground",
	"sidebar-primary",
	"sidebar-primary-foreground",
	"sidebar-accent",
	"sidebar-accent-foreground",
	"sidebar-border",
	"sidebar-ring",
]);

// ---------------------------------------------------------------------------------------------
// Source: a component folder -> registry files, with the package's imports rewritten.

// `builtin` names a shadcn item (every shadcn project already has `utils`); `dependency` one of ours.
const REWRITES: [
	RegExp,
	(match: RegExpMatchArray) => { to: string; dependency?: string; builtin?: string },
][] = [
	[/^\.\.\/lib\/utils$/, () => ({ to: "@/lib/utils", builtin: "utils" })],
	// Blocks sit two levels down and import component files by path (never a folder's index).
	[/^\.\.\/\.\.\/lib\/utils$/, () => ({ to: "@/lib/utils", builtin: "utils" })],
	[
		/^\.\.\/\.\.\/([\w-]+)\/([\w.-]+)$/,
		(m) => {
			if (!COMPONENTS.some((component) => component.name === m[1]))
				throw new Error(`blocks may only import registry components, not "${m[1]}"`);
			return { to: `@/components/ui/${m[2]}`, dependency: m[1] };
		},
	],
	[/^\.\.\/hooks\/([\w-]+)$/, (m) => ({ to: `@/hooks/${m[1]}`, dependency: m[1] })],
	[/^\.\.\/field\/field-context$/, () => ({ to: "./field-context", dependency: "field-context" })],
	// A component that uses another one (Accordion on Collapsible, Toast on Button):
	// both install into components/ui, so the import stays relative and the other component
	// becomes a registry dependency. Links no import shows (CSS one builds on) go in `needs`.
	[
		/^\.\.\/([\w-]+)\/([\w.-]+)$/,
		(m) => {
			if (!COMPONENTS.some((component) => component.name === m[1]))
				throw new Error(`components may only import registry components, not "${m[1]}"`);
			return { to: `./${m[2]}`, dependency: m[1] };
		},
	],
	[/^\.\/([\w.-]+)$/, (m) => ({ to: `./${m[1]}` })],
];

function rewrite(file: string, code: string, dependencies: Set<string>): string {
	return code.replace(/(from\s+|import\s+)"([^"]+)"/g, (whole, lead: string, spec: string) => {
		if (!spec.startsWith(".")) return whole;
		for (const [pattern, map] of REWRITES) {
			const match = spec.match(pattern);
			if (!match) continue;
			const { to, dependency, builtin } = map(match);
			if (dependency) dependencies.add(`${ORIGIN}/r/${dependency}.json`);
			if (builtin) dependencies.add(builtin);
			return `${lead}"${to}"`;
		}
		throw new Error(`${file}: no registry rewrite for import "${spec}"`);
	});
}

function componentFiles(dir: string): File[] {
	return readdirSync(join(SRC, dir))
		.filter((name) => /\.tsx?$/.test(name) && name !== "index.ts" && !/\.test\./.test(name))
		.toSorted()
		.map((name) => ({ from: `${dir}/${name}`, type: "registry:ui" as const }));
}

// ---------------------------------------------------------------------------------------------
// The items.

const COMPONENTS: {
	name: string;
	title: string;
	description: string;
	css?: string;
	/** Other items of this registry it needs, such as the CSS a component builds on. */
	needs?: string[];
}[] = [
	{
		name: "button",
		title: "Button",
		description:
			"A pill button with spring press, ripple, stateful, magnetic and metallic variants. CSS-only motion.",
		css: "button.css",
	},
	{
		name: "select",
		title: "Select",
		description:
			"A native select that unfolds a styled list where the customizable select is supported.",
		css: "select.css",
	},
	{
		name: "input",
		title: "Input",
		description:
			"A native text input in three sizes with icons, addons, a floating label, clear and password buttons, plus a one-time code. CSS-only motion.",
		css: "input.css",
	},
	{
		name: "textarea",
		title: "Textarea",
		description: "A native textarea that grows with its text.",
		css: "textarea.css",
	},
	{
		name: "field",
		title: "Field",
		description: "A label, a hint and an error wired to the control inside it.",
	},
	{
		name: "checkbox",
		title: "Checkbox",
		description:
			"A native checkbox whose tick pops in and draws itself, an indeterminate dash and three sizes. CSS-only motion.",
		css: "checkbox.css",
	},
	{
		name: "switch",
		title: "Switch",
		description:
			"A native checkbox drawn as a switch, with a thumb that stretches on press and springs across.",
		css: "switch.css",
	},
	{
		name: "radio-group",
		title: "Radio Group",
		description:
			"Native radios in a radiogroup fieldset, three sizes and choice cards, with a dot that glides to the chosen option. CSS-only motion.",
		css: "radio-group.css",
	},
	{
		name: "slider",
		title: "Slider",
		description:
			"Native range inputs as a slider or a multi-thumb range, with a value bubble, marks, three sizes, vertical and a ruler variant. CSS-only motion.",
		css: "slider.css",
	},
	{
		name: "tabs",
		title: "Tabs",
		description:
			"WAI-ARIA tabs in segmented, pill, underline and expandable variants, with an indicator that slides by CSS anchor positioning. CSS-only motion.",
		css: "tabs.css",
	},
	{
		name: "collapsible",
		title: "Collapsible",
		description:
			"A native details element whose content grows to its height, fades in out of a blur and turns its chevron over. CSS-only motion.",
		css: "collapsible.css",
	},
	{
		name: "accordion",
		title: "Accordion",
		description:
			"Single or multiple accordions on native details, in separated, cards and flush variants: the open item lifts out of the stack on a bouncy spring. CSS-only motion.",
		css: "accordion.css",
	},
	{
		name: "card",
		title: "Card",
		description:
			"A raised surface with header, title, description, action, content and footer parts, plus tilt, spotlight, expandable and stacked cards. CSS-only motion.",
		css: "card.css",
	},
	{
		name: "dialog",
		title: "Dialog",
		description:
			"A native modal dialog with header, title, description, footer and close parts, three sizes, right and bottom sheets and a morph from its trigger. CSS-only motion.",
		css: "dialog.css",
	},
	{
		name: "tooltip",
		title: "Tooltip",
		description:
			"A hint popover placed by CSS anchor positioning, with a provider for delays, flipping, an arrow and a shortcut key cap. CSS-only motion.",
		css: "tooltip.css",
	},
	{
		name: "popover",
		title: "Popover",
		description:
			"A native popover anchored to its trigger with CSS anchor positioning: flips when it would not fit and unfolds from the side it opened on. CSS-only motion.",
		css: "popover.css",
	},
	{
		name: "dropdown-menu",
		title: "Dropdown Menu",
		description:
			"A WAI-ARIA menu on the native Popover API: icons, shortcuts, checkbox and radio rows, submenus, typeahead and a highlight that glides between rows, plus a right-click ContextMenu. CSS-only motion.",
		css: "dropdown-menu.css",
		needs: ["popover"],
	},
	{
		name: "badge",
		title: "Badge",
		description: "A small tinted label in six tones.",
		css: "badge.css",
	},
	{
		name: "toast",
		title: "Toast",
		description:
			"Stacked toasts in a top-layer region: toast(), success, error, warning, info, loading and promise, with actions, swipe to dismiss, paused timers and live announcements. CSS-only motion.",
		css: "toast.css",
	},
];

/**
 * Blocks: whole screens composed of the components above, from `src/blocks/<folder>`. Their files
 * install to `components/blocks/<folder>` and their component imports become registry dependencies.
 */
const BLOCKS: {
	name: string;
	folder: string;
	title: string;
	description: string;
	css?: string;
	categories: string[];
}[] = [
	{
		name: "signup-block",
		folder: "signup",
		title: "Sign-up block",
		description:
			"A three-step sign-up card (details with a password meter, an emailed code with a resend countdown, a drawn tick) and a compact sign-in card, made of the Rabtx components. CSS-only motion.",
		css: "signup-block.css",
		categories: ["authentication"],
	},
	{
		name: "command-block",
		folder: "command",
		title: "Command palette block",
		description:
			"A ⌘K command palette in a native dialog: fuzzy search over grouped commands, an ARIA combobox and listbox, recent items, nested pages, loading and empty states, keyboard hints and a highlight that slides by CSS anchor positioning. Made of the Rabtx components. CSS-only motion.",
		css: "command-block.css",
		categories: ["navigation"],
	},
	{
		name: "settings-block",
		folder: "settings",
		title: "Settings block",
		description:
			"A settings page in sections (profile, account, notifications, appearance, danger zone) on Tabs that turn vertical when the block is wide, with an unsaved changes bar and dialogs to change the email and delete the account, made of the Rabtx components. CSS-only motion.",
		css: "settings-block.css",
		categories: ["settings", "account"],
	},
];

/** A link to another item of this registry; the docs route fills in the origin. */
const dep = (name: string) => `${ORIGIN}/r/${name}.json`;
/** Theme variables for registry users: their own font stays. */
const withoutFont = (block: Record<string, string>) =>
	Object.fromEntries(Object.entries(block).filter(([name]) => name !== "font-sans"));
/** The files in a folder, sorted, or none. */
const listFiles = (dir: string) => (existsSync(dir) ? readdirSync(dir).toSorted() : []);

function buildItems(warnings: string[]): Item[] {
	const springs = springVars();

	const items: Item[] = [
		{
			name: "theme",
			type: "registry:theme",
			title: "Rabtx theme",
			description:
				"The Rabtx colors, radius, depth, shadows and status tones as shadcn theme variables.",
			cssVars: {
				theme: themeMappings(),
				light: withoutFont(themeBlock(":root, .rabtx")),
				dark: withoutFont(themeBlock(".dark, .rabtx.dark, .dark .rabtx:not(.light)")),
			},
		},
		{
			name: "utils",
			type: "registry:lib",
			title: "cn",
			description:
				"The class name helper the components import from @/lib/utils (clsx, then tailwind-merge). shadcn projects already have one; install this only if yours is missing.",
			dependencies: ["clsx", "tailwind-merge"],
			files: [{ from: "lib/utils.ts", type: "registry:lib" }],
		},
		{
			name: "springs",
			type: "registry:lib",
			title: "Springs",
			description:
				"The spring solver and the solved spring easings (--spring-*) every Rabtx animation uses.",
			files: [{ from: "motion/springs.ts", type: "registry:lib" }],
			cssVars: {
				theme: Object.fromEntries(
					Object.keys(springs)
						.filter((name) => !name.endsWith("-duration"))
						.map((name) => [`ease-${name}`, `var(--${name})`]),
				),
				light: springs,
			},
		},
		{
			name: "rabtx",
			type: "registry:style",
			title: "Rabtx base",
			description:
				"Defaults for the Rabtx-only tokens (derived from your theme), the radius and depth modes, and the shared surface styles.",
			registryDependencies: [dep("springs")],
			css: {
				...cssObject(
					readFileSync(join(PKG, "registry/defaults.css"), "utf8"),
					"defaults.css",
					warnings,
				),
				...radiusModes(warnings),
				...cssObject(readStyle("control.css"), "control.css", warnings),
			},
		},
		{
			name: "use-base-select",
			type: "registry:hook",
			title: "useBaseSelect",
			description:
				"Whether the browser draws a customizable select list (appearance: base-select).",
			files: [{ from: "hooks/use-base-select.ts", type: "registry:hook" }],
		},
		{
			name: "use-popover",
			type: "registry:hook",
			title: "usePopoverState",
			description:
				"Keeps a React open state in step with a native [popover] element, names its CSS anchor and merges a trigger into its child.",
			files: [{ from: "hooks/use-popover.tsx", type: "registry:hook" }],
		},
		{
			name: "field-context",
			type: "registry:ui",
			title: "Field context",
			description: "Shares a Field's id, hint and error with the control inside it.",
			files: [{ from: "field/field-context.ts", type: "registry:ui" }],
		},
	];

	for (const component of COMPONENTS) {
		const files = componentFiles(component.name).filter(
			(f) => !f.from.endsWith("field-context.ts"),
		);
		items.push({
			name: component.name,
			type: "registry:ui",
			title: component.title,
			description: component.description,
			files,
			registryDependencies: [dep("rabtx"), ...(component.needs ?? []).map(dep)],
			css: component.css ? cssObject(readStyle(component.css), component.css, warnings) : undefined,
		});
	}
	for (const block of BLOCKS) {
		const dir = `blocks/${block.folder}`;
		items.push({
			name: block.name,
			type: "registry:block",
			title: block.title,
			description: block.description,
			files: componentFiles(dir).map(({ from }) => ({
				from,
				type: "registry:component" as const,
				target: `components/${dir}/${basename(from)}`,
			})),
			registryDependencies: [dep("rabtx")],
			css: block.css ? cssObject(readStyle(block.css), block.css, warnings) : undefined,
			categories: block.categories,
		});
	}
	return items;
}

// ---------------------------------------------------------------------------------------------
// Check that the components only use tokens the registry defines.

function checkTokens(items: Item[]) {
	const defined = new Set<string>([...SHADCN_TOKENS, ...Object.keys(springVars())]);
	for (const match of readFileSync(join(PKG, "registry/defaults.css"), "utf8").matchAll(
		/^\s*--([\w-]+):/gm,
	)) {
		defined.add(match[1]);
	}
	for (const item of items) {
		for (const file of item.files ?? []) {
			const code = readFileSync(join(SRC, file.from), "utf8");
			for (const m of code.matchAll(/(?:var\(|\(|\[)--([a-z][\w-]*)/g)) {
				if (!defined.has(m[1]))
					throw new Error(`${file.from}: --${m[1]} is not defined for registry users`);
			}
		}
		for (const m of JSON.stringify(item.css ?? {}).matchAll(/var\(--([a-z][\w-]*)/g)) {
			if (!defined.has(m[1]))
				throw new Error(`${item.name} css: --${m[1]} is not defined for registry users`);
		}
	}
}

// ---------------------------------------------------------------------------------------------
// Check that motion preferences sit in the rx-motion layer. The shadcn CLI merges every item's
// `@media (prefers-reduced-motion: reduce)` block into the first one in a project's CSS, which can
// sit before the rules it overrides; a cascade layer declared after `components` wins wherever it is.

const MOTION_LAYER = "@layer rx-motion";

function checkMotionLayer(items: Item[]) {
	const walk = (css: CssObject, path: string[], item: string) => {
		for (const [key, value] of Object.entries(css)) {
			if (typeof value !== "object") continue;
			const motion =
				key.startsWith("@media (prefers-reduced-motion") || key.includes('[data-motion="off"]');
			if (motion && !path.includes(MOTION_LAYER))
				throw new Error(
					`${item} css: "${key}" belongs in ${MOTION_LAYER}, not ${path[0] ?? "the root"}`,
				);
			walk(value, [...path, key], item);
		}
	};
	for (const item of items) if (item.css) walk(item.css, [], item.name);
}

// ---------------------------------------------------------------------------------------------

function stage(items: Item[]): string {
	const dir = mkdtempSync(join(tmpdir(), "rabtx-registry-"));
	const registryItems = items.map((item) => {
		const dependencies = new Set<string>();
		const files = (item.files ?? []).map((file) => {
			const folder =
				file.type === "registry:lib"
					? "lib"
					: file.type === "registry:hook"
						? "hooks"
						: file.type === "registry:component"
							? dirname(file.from)
							: "ui";
			const path = `registry/rabtx/${folder}/${basename(file.from)}`;
			mkdirSync(join(dir, `registry/rabtx/${folder}`), { recursive: true });
			const code = rewrite(file.from, readFileSync(join(SRC, file.from), "utf8"), dependencies);
			writeFileSync(join(dir, path), code);
			return file.target
				? { path, type: file.type, target: file.target }
				: { path, type: file.type };
		});
		const registryDependencies = [...(item.registryDependencies ?? []), ...dependencies];
		return {
			name: item.name,
			type: item.type,
			title: item.title,
			description: item.description,
			...(item.dependencies && { dependencies: item.dependencies }),
			...(registryDependencies.length && {
				registryDependencies: [...new Set(registryDependencies)],
			}),
			...(files.length && { files }),
			...(item.cssVars && { cssVars: item.cssVars }),
			...(item.css && { css: item.css }),
			...(item.categories && { categories: item.categories }),
		};
	});
	writeFileSync(
		join(dir, "registry.json"),
		JSON.stringify(
			{
				$schema: "https://ui.shadcn.com/schema/registry.json",
				name: "rabtx",
				homepage: `${ORIGIN}/docs/ui`,
				items: registryItems,
			},
			null,
			2,
		),
	);
	return dir;
}

function build(out: string) {
	const warnings: string[] = [];
	const items = buildItems(warnings);
	checkTokens(items);
	checkMotionLayer(items);
	const dir = stage(items);
	rmSync(out, { recursive: true, force: true });
	mkdirSync(out, { recursive: true });
	execFileSync(SHADCN, ["build", "registry.json", "--output", out], { cwd: dir, stdio: "pipe" });
	// The catalog `shadcn list` and `search` read, next to the items.
	cpSync(join(dir, "registry.json"), join(out, "registry.json"));
	rmSync(dir, { recursive: true, force: true });
	return warnings;
}

const check = process.argv.includes("--check");
if (check) {
	const tmp = mkdtempSync(join(tmpdir(), "rabtx-registry-check-"));
	build(tmp);
	const stale = [...new Set([...listFiles(tmp), ...listFiles(OUT)])].filter((name) => {
		const a = join(tmp, name);
		const b = join(OUT, name);
		return !existsSync(a) || !existsSync(b) || readFileSync(a, "utf8") !== readFileSync(b, "utf8");
	});
	rmSync(tmp, { recursive: true, force: true });
	if (stale.length) {
		console.error(
			`Registry out of date: ${stale.join(", ")}. Run \`bun run registry\` in packages/rabtx.`,
		);
		process.exit(1);
	}
	console.log("Registry is up to date.");
} else {
	const warnings = build(OUT);
	for (const warning of warnings) console.warn(`warning: ${warning}`);
	console.log(`Wrote ${readdirSync(OUT).length} files to ${OUT}`);
}
