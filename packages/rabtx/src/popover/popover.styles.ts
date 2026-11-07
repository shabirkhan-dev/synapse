import type { PopoverAlign, PopoverSide } from "../hooks/use-popover";

/**
 * Class names for a Popover, for markup written by hand. The look and the motion live in
 * `popover.css` (your global CSS, when installed from the registry), on top of the shared surface
 * in `control.css`, so plain HTML gets the same popover from these names:
 *
 *   <button popovertarget="p" style="anchor-name: --p">Open</button>
 *   <div id="p" popover class="rx-popover" data-side="bottom" data-align="center"
 *        style="position-anchor: --p">
 *     <div class="rx-surface rx-popover-surface rx-popover-content">…</div>
 *   </div>
 *
 * The outer element is the `[popover]`: it is positioned against the anchor and flips when it would
 * not fit. The inner one is the panel the motion animates, from the side that touches the anchor.
 */
export const popoverParts = {
	/** The `[popover]` element, positioned by `data-side` and `data-align`. */
	root: "rx-popover",
	/** The animated panel inside it (shared by menus). */
	surface: "rx-surface rx-popover-surface",
	/** The popover panel's own padding, width and type. */
	content: "rx-popover-content",
	header: "rx-popover-header",
	title: "rx-popover-title",
	description: "rx-popover-description",
} as const;

/** The attributes `popover.css` places a `[popover]` element by. */
export function placement({
	side = "bottom",
	align = "center",
}: {
	side?: PopoverSide;
	align?: PopoverAlign;
} = {}) {
	return { "data-side": side, "data-align": align } as const;
}
