export type TabsVariant = "segmented" | "pill" | "underline" | "expandable";
export type TabsSize = "sm" | "md" | "lg";
export type TabsOrientation = "horizontal" | "vertical";
/** `automatic` selects a tab as focus reaches it; `manual` waits for Enter or Space. */
export type TabsActivationMode = "automatic" | "manual";

export const tabsVariants = [
	"segmented",
	"pill",
	"underline",
	"expandable",
] as const satisfies readonly TabsVariant[];
export const tabsSizes = ["sm", "md", "lg"] as const satisfies readonly TabsSize[];

/**
 * The class list for a tab list. The look and the motion live in `tabs.css` (your global CSS, when
 * installed from the registry), so React and plain HTML get the same tabs from these names. The
 * selected tab carries `aria-selected="true"`; the indicator is the list's last child and finds it
 * by CSS anchor positioning, so nothing measures it:
 *
 *   <div class="rx-tabs" data-orientation="horizontal">
 *     <div role="tablist" class="rx-tabs-list rx-tabs-segmented rx-tabs-md">
 *       <button role="tab" class="rx-tabs-trigger" aria-selected="true" aria-controls="p1">
 *         <span class="rx-tabs-label"><span class="rx-tabs-text">Account</span></span>
 *       </button>
 *       <span class="rx-tabs-indicator" aria-hidden="true"></span>
 *     </div>
 *     <div role="tabpanel" id="p1" class="rx-tabs-content" tabindex="0">…</div>
 *   </div>
 */
export function tabsListClass(variant: TabsVariant = "segmented", size: TabsSize = "md") {
	return `rx-tabs-list rx-tabs-${variant} rx-tabs-${size}`;
}

/** Class names for the parts of Tabs, for markup written by hand. */
export const tabsParts = {
	/** The wrapper around the list and the panels. Lays them out by `data-orientation`. */
	root: "rx-tabs",
	/** One tab: a `<button role="tab">`. */
	trigger: "rx-tabs-trigger",
	/** A decorative icon before the label. In `expandable` it is all an unselected tab shows. */
	icon: "rx-tabs-icon",
	/** The label's box. In `expandable` it opens from zero width on the selected tab. */
	label: "rx-tabs-label",
	/** The label text inside the box. */
	text: "rx-tabs-text",
	/** The sliding highlight, anchored to the selected tab. Decorative. */
	indicator: "rx-tabs-indicator",
	/** One panel: a `<div role="tabpanel">`, `hidden` while its tab is not selected. */
	content: "rx-tabs-content",
} as const;
