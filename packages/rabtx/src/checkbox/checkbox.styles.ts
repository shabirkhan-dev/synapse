export type CheckboxSize = "sm" | "md" | "lg";

export const checkboxSizes = ["sm", "md", "lg"] as const satisfies readonly CheckboxSize[];

/**
 * The class list for a Checkbox's box. The look lives in `checkbox.css` (your global CSS, when
 * installed from the registry), so React and plain HTML get the same control from these names:
 *
 *   <label class="rx-checkbox-label">
 *     <span class="rx-checkbox rx-checkbox-md">
 *       <input type="checkbox" class="rx-checkbox-input" />
 *       <svg class="rx-checkbox-mark rx-checkbox-check" viewBox="0 0 24 24" aria-hidden="true">
 *         <path d="M5 13l4 4L19 7" pathLength="1" />
 *       </svg>
 *       <svg class="rx-checkbox-mark rx-checkbox-dash" viewBox="0 0 24 24" aria-hidden="true">
 *         <path d="M6 12h12" pathLength="1" />
 *       </svg>
 *     </span>
 *     <span class="rx-checkbox-text"><span>Email me updates</span></span>
 *   </label>
 */
export function checkboxClass(size: CheckboxSize = "md") {
	return `rx-checkbox rx-checkbox-${size}`;
}

/** Class names for the parts of a Checkbox, for markup written by hand. */
export const checkboxParts = {
	/** The native checkbox. Invisible, it covers the box and a 24px target around it. */
	input: "rx-checkbox-input",
	/** Both glyphs. Each is an SVG whose path draws itself in with `stroke-dashoffset`. */
	mark: "rx-checkbox-mark",
	/** The tick, shown while checked. */
	check: "rx-checkbox-check",
	/** The dash, shown while indeterminate. */
	dash: "rx-checkbox-dash",
	/** The row around the box and its text, so the text names it and is clickable. */
	label: "rx-checkbox-label",
	/** The label text and the description, stacked. */
	text: "rx-checkbox-text",
	/** A quieter line under the label, announced as the description. */
	description: "rx-checkbox-description",
} as const;

/** The glyphs' paths, on a 24px grid. `pathLength="1"` lets the CSS draw them from 1 to 0. */
export const checkboxPaths = {
	check: "M5 13l4 4L19 7",
	dash: "M6 12h12",
} as const;
