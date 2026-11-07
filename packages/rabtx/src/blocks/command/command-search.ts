import type { ReactNode } from "react";
import type { BadgeTone } from "../../badge/badge.styles";

/** One command. Give it `onSelect` to run it, or `items` to open a page of more commands. */
export type CommandItem = {
	/** Unique among the commands; also the key for recent items. */
	id: string;
	label: string;
	/** The heading it is listed under. Items without one are listed under no heading. */
	group?: string;
	/** A second line, muted. Searched too. */
	description?: string;
	/** Extra words that find it, such as synonyms. Not shown. */
	keywords?: string[];
	/** A decorative 16px icon, such as a HugeIcons element. */
	icon?: ReactNode;
	/** Keys to show at the end, such as `["⌘", "N"]`. Only a hint: the block does not bind them. */
	shortcut?: string[];
	/** A short label in a Badge, such as "New". */
	badge?: string;
	badgeTone?: BadgeTone;
	disabled?: boolean;
	/** A page of commands, or a function that loads them (the list shows a loading state). */
	items?: CommandItem[] | (() => Promise<CommandItem[]>);
	/** The search placeholder on this item's page. */
	placeholder?: string;
	/** Runs when the command is chosen with Enter or a click. */
	onSelect?: (item: CommandItem) => void;
	/** Keep the palette open after it runs, such as a toggle. */
	keepOpen?: boolean;
};

/** A row in the list: the item, the page items above it, and the label's matched letters. */
export type CommandRow = {
	key: string;
	item: CommandItem;
	/** The pages the item sits in below the current one, when a search on the first page finds it. */
	parents: CommandItem[];
	match: number[];
};

export type CommandSection = { key: string; heading?: string; rows: CommandRow[] };

const BOUNDARY = /[\s\-_/.:()[\]]/;

/** Lowercase without accents, one character per character so match positions still line up. */
function fold(text: string) {
	const folded = text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
	return folded.length === text.length ? folded : text.toLowerCase();
}

const atBoundary = (text: string, i: number) => i === 0 || BOUNDARY.test(text[i - 1]);

/** The query's letters in order, each at its earliest place after the last (always finds one). */
function earliest(text: string, query: string) {
	const indices: number[] = [];
	let from = 0;
	for (const char of query) {
		const i = text.indexOf(char, from);
		if (i < 0) return null;
		indices.push(i);
		from = i + 1;
	}
	return indices;
}

/** Like `earliest`, but a letter that starts a word wins over one inside a word ("gs" → Git Status). */
function preferWords(text: string, query: string) {
	const indices: number[] = [];
	let from = 0;
	let prev = -2;
	for (const char of query) {
		let first = -1;
		let word = -1;
		for (let i = from; i < text.length; i++) {
			if (text[i] !== char) continue;
			if (first < 0) first = i;
			if (atBoundary(text, i)) {
				word = i;
				break;
			}
		}
		if (first < 0) return null;
		const i = first === prev + 1 || word < 0 ? first : word;
		indices.push(i);
		prev = i;
		from = i + 1;
	}
	return indices;
}

/**
 * How well `query` matches `text`, and which letters of `text` matched, or `null`. A run of the
 * query's letters (best at the start, or at a word's start) beats letters spread over the text; a
 * spread match counts only when most of its letters start a word or follow the previous one, so
 * "nf" finds "New file" but two random letters do not find everything.
 */
export function fuzzyMatch(
	text: string,
	query: string,
): { score: number; indices: number[] } | null {
	const t = fold(text);
	const q = fold(query).replace(/\s+/g, " ").trim();
	if (!q) return { score: 0, indices: [] };

	const at = t.indexOf(q);
	if (at >= 0) {
		const score =
			1000 +
			(t.length === q.length ? 1000 : 0) +
			(at === 0 ? 400 : 0) +
			(atBoundary(t, at) ? 200 : 0) -
			at;
		return { score, indices: Array.from({ length: q.length }, (_, k) => at + k) };
	}

	const letters = q.replace(/ /g, "");
	if (letters.length < 2) return null;
	const indices = preferWords(t, letters) ?? earliest(t, letters);
	if (!indices) return null;
	let score = 0;
	let good = 0;
	indices.forEach((i, k) => {
		const run = k > 0 && i === indices[k - 1] + 1;
		const word = atBoundary(t, i);
		if (run || word) good++;
		score += run ? 30 : word ? 24 : 2;
	});
	if (good / indices.length < 0.6) return null;
	return { score: score - (indices.at(-1)! - indices[0]), indices };
}

/** Score an item against a query: the label counts most, then keywords, description, group, path. */
export function scoreItem(item: CommandItem, query: string, path: string[] = []) {
	const whole = fuzzyMatch(item.label, query);
	if (whole && whole.indices.length && whole.score >= 1000) return whole;

	const tokens = query.trim().split(/\s+/).filter(Boolean);
	if (!tokens.length) return { score: 0, indices: [] };
	const others = [...(item.keywords ?? []), item.description ?? "", item.group ?? "", ...path];
	const indices = new Set<number>();
	let score = 0;
	for (const token of tokens) {
		const label = fuzzyMatch(item.label, token);
		const other = Math.max(-1, ...others.map((text) => fuzzyMatch(text, token)?.score ?? -1));
		if (!label && other < 0) return whole;
		if (label && label.score >= other / 2) {
			score += label.score;
			for (const i of label.indices) indices.add(i);
		} else score += other / 2;
	}
	const best = { score, indices: [...indices].toSorted((a, b) => a - b) };
	return whole && whole.score > best.score ? whole : best;
}

/** The labels of a row's parents, for its breadcrumb. */
export const labels = (parents: CommandItem[]) => parents.map((parent) => parent.label);

type Entry = { item: CommandItem; parents: CommandItem[] };

/** Every item in `items` and, below it, in the pages that are already arrays (not loaders). */
export function flatten(items: CommandItem[], parents: CommandItem[] = []): Entry[] {
	return items.flatMap((item) => [
		{ item, parents },
		...(Array.isArray(item.items) ? flatten(item.items, [...parents, item]) : []),
	]);
}

export type SectionOptions = {
	items: CommandItem[];
	query: string;
	/** On the first page, a query also searches the pages below it. */
	root: boolean;
	/** Recent ids, newest first; listed first while the query is empty on the first page. */
	recent?: string[];
	recentLabel?: string;
	/** Only this group (a scope), or every group. */
	scope?: string;
	/** `false` lists the items as given, for results filtered by your own search. */
	filter?: boolean;
};

/** Group rows under their headings, in the order the headings first appear. */
function group(rows: CommandRow[], heading: (row: CommandRow) => string | undefined) {
	const sections = new Map<string, CommandSection>();
	for (const row of rows) {
		const name = heading(row);
		const key = `group:${name ?? ""}`;
		const section = sections.get(key) ?? { key, heading: name, rows: [] };
		section.rows.push(row);
		sections.set(key, section);
	}
	return [...sections.values()];
}

const row = (prefix: string, { item, parents }: Entry, match: number[] = []): CommandRow => ({
	key: `${prefix}:${item.id}`,
	item,
	parents,
	match,
});

/** The sections to list for a page, a query, the recent ids and a scope. */
export function commandSections({
	items,
	query,
	root,
	recent = [],
	recentLabel = "Recent",
	scope,
	filter = true,
}: SectionOptions): CommandSection[] {
	const inScope = (item: CommandItem) => !scope || item.group === scope;

	if (!query.trim() || !filter) {
		const sections = group(
			items.filter(inScope).map((item) => row("item", { item, parents: [] })),
			(r) => r.item.group,
		);
		if (!root || scope || !recent.length || query.trim()) return sections;
		const known = new Map(flatten(items).map((entry) => [entry.item.id, entry]));
		const rows = recent.flatMap((id) => {
			const entry = known.get(id);
			return entry && !entry.item.items ? [row("recent", entry)] : [];
		});
		return rows.length ? [{ key: "recent", heading: recentLabel, rows }, ...sections] : sections;
	}

	const entries = root ? flatten(items) : items.map((item) => ({ item, parents: [] }));
	const scored = entries
		.filter(({ item }) => inScope(item))
		.flatMap((entry) => {
			const match = scoreItem(entry.item, query, labels(entry.parents));
			return match ? [{ entry, match }] : [];
		})
		// Shallower first on a tie, so a page's own item beats the same words deeper down.
		.toSorted(
			(a, b) => b.match.score - a.match.score || a.entry.parents.length - b.entry.parents.length,
		);
	return group(
		scored.map(({ entry, match }) => row("item", entry, match.indices)),
		(r) => r.item.group ?? r.parents.at(-1)?.label,
	);
}

/** The groups on a page, in order, for scope tabs. */
export function commandGroups(items: CommandItem[]) {
	return [...new Set(items.flatMap((item) => (item.group ? [item.group] : [])))];
}

/** Put `id` first in a recent list, without repeats, capped at `limit`. */
export function pushRecent(recent: string[], id: string, limit: number) {
	return [id, ...recent.filter((other) => other !== id)].slice(0, Math.max(0, limit));
}
