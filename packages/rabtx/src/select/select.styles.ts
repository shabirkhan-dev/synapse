export type SelectSize = "sm" | "md" | "lg";

export const selectSizes = ["sm", "md", "lg"] as const satisfies readonly SelectSize[];

/**
 * The class list for a Select's wrapper. The look lives in `select.css` (your global CSS, when
 * installed from the registry), so React and plain HTML get the same control from these names:
 *
 *   <div class="rx-select-field rx-select-md">
 *     <select class="rx-select">…</select>
 *     <span class="rx-select-chevron" aria-hidden="true"></span>
 *   </div>
 */
export function selectClass(size: SelectSize = "md") {
	return `rx-select-field rx-select-${size}`;
}

/** Class names for the parts of a Select, for markup written by hand. */
export const selectParts = {
	/** The native `<select>`. It draws the trigger and, where supported, the styled list. */
	select: "rx-select",
	/** The arrow on the trailing edge. It turns over while the list is open. */
	chevron: "rx-select-chevron",
	/** An icon before the value. Add `data-leading` to the select so the text makes room. */
	leading: "rx-select-leading",
	/** An icon inside one option, shown only in the styled list. */
	itemIcon: "rx-select-item-icon",
	separator: "rx-select-separator",
} as const;

/** Where the list opens. Set on the select as `data-side` just before it opens. */
export type SelectSide = "bottom" | "top";

/**
 * Below unless the list would not fit there and there is more room above. `height` is the list's
 * expected height and `margin` the space it keeps from the viewport edge.
 */
export function chooseSide({
	above,
	below,
	height,
	margin = 16,
}: {
	above: number;
	below: number;
	height: number;
	margin?: number;
}): SelectSide {
	return below < height + margin && above > below ? "top" : "bottom";
}

/**
 * The list's expected height before it opens, from what it will show: visible options, group
 * labels and separators, plus the list's padding and border.
 */
export function estimateListHeight({
	options,
	groups = 0,
	separators = 0,
	row = 32,
	groupLabel = 28,
	separator = 9,
	chrome = 10,
}: {
	options: number;
	groups?: number;
	separators?: number;
	row?: number;
	groupLabel?: number;
	separator?: number;
	chrome?: number;
}) {
	return options * row + groups * groupLabel + separators * separator + chrome;
}
