/**
 * Class names for the parts of Collapsible, for markup written by hand. The look and the motion live
 * in `collapsible.css` (your global CSS, when installed from the registry). It is a `<details>`, so it
 * opens and closes with no script at all:
 *
 *   <details class="rx-collapsible">
 *     <summary class="rx-collapsible-trigger">
 *       More details <span class="rx-collapsible-chevron" aria-hidden="true"></span>
 *     </summary>
 *     <div class="rx-collapsible-content">…</div>
 *   </details>
 */
export const collapsibleParts = {
	/** The `<details>`. Its content grows to its own height when it opens. */
	root: "rx-collapsible",
	/** The `<summary>`: the toggle, a button to assistive tech. */
	trigger: "rx-collapsible-trigger",
	/** The chevron that turns over as it opens. Decorative. */
	chevron: "rx-collapsible-chevron",
	/** Everything after the summary. Fades in out of a small blur. */
	content: "rx-collapsible-content",
} as const;
