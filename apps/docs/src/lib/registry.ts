import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Where the built registry lives: `bun run registry` in packages/rabtx writes it. */
const REGISTRY_DIR = join(process.cwd(), "registry/r");

/** The placeholder the registry build leaves wherever an item points at another item. */
const ORIGIN = "{{origin}}";

/**
 * The public URL the registry is served from, without the `/r`. `RABTX_REGISTRY_URL` wins (set it
 * when the docs sit behind a proxy), then `NEXT_PUBLIC_DOCS_URL`, then the request's own origin, so
 * a local dev server on any port hands out working links.
 */
export function registryOrigin(requestUrl?: string): string {
	const configured = process.env.RABTX_REGISTRY_URL || process.env.NEXT_PUBLIC_DOCS_URL;
	if (configured) return configured.replace(/\/+$/, "");
	if (requestUrl) return new URL(requestUrl).origin;
	return "http://localhost:3002";
}

/** A built registry file (`button.json`, `registry.json`) with its links pointed at `origin`. */
export async function readRegistryFile(file: string, origin: string): Promise<string | null> {
	if (!/^[\w-]+\.json$/.test(file)) return null;
	try {
		const text = await readFile(join(REGISTRY_DIR, file), "utf8");
		return text.replaceAll(ORIGIN, origin);
	} catch {
		return null;
	}
}

export type RegistryFile = { path: string; type: string; content: string; target?: string };
export type RegistryItem = {
	name: string;
	type?: string;
	title?: string;
	description?: string;
	dependencies?: string[];
	registryDependencies?: string[];
	files?: RegistryFile[];
	css?: Record<string, unknown>;
	cssVars?: Record<string, Record<string, string>>;
};

/** A registry item, parsed, for the docs' install instructions. */
export async function readRegistryItem(name: string, origin = registryOrigin()) {
	const text = await readRegistryFile(`${name}.json`, origin);
	if (!text)
		throw new Error(`No registry item "${name}". Run \`bun run registry\` in packages/rabtx.`);
	return JSON.parse(text) as RegistryItem;
}

/** The item name a registry dependency points at, or null for shadcn's own items (`utils`). */
function localDependency(dep: string): string | null {
	const match = dep.match(/\/r\/([\w-]+)\.json$/);
	return match ? match[1] : null;
}

/** The item and every item of this registry it pulls in, dependencies first, each once. */
export async function readRegistryTree(name: string, origin = registryOrigin()) {
	// The registry is small, so read every item once instead of walking it request by request.
	const index = await readRegistryFile("registry.json", origin);
	if (!index) throw new Error("No registry.json. Run `bun run registry` in packages/rabtx.");
	const names = (JSON.parse(index) as { items: { name: string }[] }).items.map((item) => item.name);
	const all = await Promise.all(names.map((itemName) => readRegistryItem(itemName, origin)));
	const loaded = new Map(all.map((item) => [item.name, item]));
	const ordered = new Map<string, RegistryItem>();
	const visit = (itemName: string) => {
		const item = loaded.get(itemName);
		if (!item || ordered.has(itemName)) return;
		for (const dep of item.registryDependencies ?? []) {
			const local = localDependency(dep);
			if (local) visit(local);
		}
		ordered.set(itemName, item);
	};
	visit(name);
	return [...ordered.values()];
}

/** Where shadcn writes a registry file, relative to the project's `src` (or root). */
export function targetPath(file: RegistryFile): string {
	if (file.target) return file.target;
	const base = file.path.split("/").pop() ?? file.path;
	if (file.type === "registry:lib") return `lib/${base}`;
	if (file.type === "registry:hook") return `hooks/${base}`;
	return `components/ui/${base}`;
}

type CssTree = { [key: string]: string | CssTree };

function cssBlock(selector: string, body: CssTree, depth: number): string {
	const pad = "  ".repeat(depth);
	const inner = Object.entries(body)
		.map(([key, value]) =>
			typeof value === "string" ? `${pad}  ${key}: ${value};` : cssBlock(key, value, depth + 1),
		)
		.join("\n");
	return `${pad}${selector} {\n${inner}\n${pad}}`;
}

function varsBlock(selector: string, vars: Record<string, string> | undefined): string | null {
	if (!vars || Object.keys(vars).length === 0) return null;
	const body: CssTree = {};
	for (const [key, value] of Object.entries(vars)) body[`--${key}`] = value;
	return cssBlock(selector, body, 0);
}

/**
 * The CSS a list of items adds to the global stylesheet, written out as plain CSS, for readers who
 * copy the files by hand instead of running the CLI.
 */
export function registryCss(items: RegistryItem[]): string {
	const blocks: string[] = [];
	for (const item of items) {
		const parts = [
			varsBlock("@theme inline", item.cssVars?.theme),
			varsBlock(":root", item.cssVars?.light),
			varsBlock(".dark", item.cssVars?.dark),
			...Object.entries((item.css ?? {}) as CssTree).map(([key, value]) =>
				typeof value === "string" ? `${key};` : cssBlock(key, value, 0),
			),
		].filter((part): part is string => part !== null);
		if (parts.length > 0) blocks.push(`/* ${item.name} */\n${parts.join("\n\n")}`);
	}
	return blocks.join("\n\n");
}
