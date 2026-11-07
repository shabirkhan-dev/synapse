export type SwitchSize = "sm" | "md" | "lg";

export const switchSizes = ["sm", "md", "lg"] as const satisfies readonly SwitchSize[];

/**
 * The class list for a Switch. The look and the motion live in `switch.css` (your global CSS, when
 * installed from the registry), so React and plain HTML get the same switch from these names:
 *
 *   <input type="checkbox" role="switch" switch class="rx-switch rx-switch-md" aria-label="Wi-Fi">
 */
export function switchClass(size: SwitchSize = "md") {
	return `rx-switch rx-switch-${size}`;
}

/** Class names for the parts around a Switch, for markup written by hand. */
export const switchParts = {
	/** A `<label>` around the switch and its text, so the whole row toggles it. */
	label: "rx-switch-label",
} as const;
