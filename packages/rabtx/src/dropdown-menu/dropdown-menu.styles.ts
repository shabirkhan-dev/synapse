/**
 * Class names for a menu, for markup written by hand. A menu is a popover (`popover.css` places
 * and animates it) whose panel also carries `rx-menu`; `dropdown-menu.css` draws the rows and the
 * highlight that glides between them:
 *
 *   <div id="m" popover role="menu" class="rx-popover" data-side="bottom" data-align="start">
 *     <div class="rx-surface rx-popover-surface rx-menu">
 *       <div role="menuitem" tabindex="-1" class="rx-menu-item">…</div>
 *       <span class="rx-menu-highlight" aria-hidden="true"></span>
 *     </div>
 *   </div>
 */
export const menuParts = {
	/** The panel, added to the popover surface. */
	menu: "rx-menu",
	item: "rx-menu-item",
	icon: "rx-menu-icon",
	label: "rx-menu-text",
	shortcut: "rx-menu-shortcut",
	/** The box a checkbox or radio item draws its tick or dot in. */
	indicator: "rx-menu-indicator",
	check: "rx-menu-check",
	dot: "rx-menu-dot",
	subTrigger: "rx-menu-subtrigger",
	heading: "rx-menu-label",
	separator: "rx-menu-separator",
	/** The last child of the panel: the highlight, placed on the active row by anchor positioning. */
	highlight: "rx-menu-highlight",
	/** The invisible point a context menu is anchored to. */
	point: "rx-menu-point",
} as const;

/** Item tones: the default, or a destructive action drawn in --destructive. */
export type MenuItemVariant = "default" | "destructive";

/** The enabled rows of a menu, in order, leaving out the rows of any submenu inside it. */
export function menuItems(menu: Element): HTMLElement[] {
	return [
		...menu.querySelectorAll<HTMLElement>(
			'[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
		),
	].filter(
		(item) =>
			item.closest('[role="menu"]') === menu && item.getAttribute("aria-disabled") !== "true",
	);
}

/** The index to move to for a navigation key, wrapping at both ends; -1 when the key is not one. */
export function nextIndex(key: string, current: number, count: number): number {
	if (count === 0) return -1;
	switch (key) {
		case "ArrowDown":
			return current < 0 ? 0 : (current + 1) % count;
		case "ArrowUp":
			return current < 0 ? count - 1 : (current - 1 + count) % count;
		case "Home":
		case "PageUp":
			return 0;
		case "End":
		case "PageDown":
			return count - 1;
		default:
			return -1;
	}
}

/**
 * Typeahead: the next row (after the current one, wrapping) whose text starts with what was typed.
 * A run of one repeated letter cycles through the rows starting with it.
 */
export function typeaheadMatch(labels: string[], current: number, typed: string): number {
	const query = typed.toLocaleLowerCase();
	const repeated = query.length > 1 && [...query].every((char) => char === query[0]);
	const search = repeated ? query[0] : query;
	// A new run starts after the current row; a growing one may stay on it.
	const start = search.length === 1 ? current + 1 : Math.max(current, 0);
	for (let offset = 0; offset < labels.length; offset++) {
		const index = (start + offset) % labels.length;
		if (labels[index].trim().toLocaleLowerCase().startsWith(search)) return index;
	}
	return -1;
}
