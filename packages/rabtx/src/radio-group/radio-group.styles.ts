export type RadioGroupSize = "sm" | "md" | "lg";
export type RadioGroupVariant = "default" | "card";
export type RadioGroupOrientation = "vertical" | "horizontal";

export const radioGroupSizes = ["sm", "md", "lg"] as const satisfies readonly RadioGroupSize[];
export const radioGroupVariants = [
	"default",
	"card",
] as const satisfies readonly RadioGroupVariant[];

/**
 * The class list for a RadioGroup. The look and the motion live in `radio-group.css` (your global
 * CSS, when installed from the registry), so React and plain HTML get the same group from these
 * names. The size and the variant sit on the group; every option inside follows them.
 *
 *   <fieldset role="radiogroup" class="rx-radio-group rx-radio-group-md" aria-label="Plan">
 *     <label class="rx-radio-item">
 *       <span class="rx-radio">
 *         <input type="radio" name="plan" value="pro" class="rx-radio-input" />
 *       </span>
 *       <span class="rx-radio-text"><span>Pro</span></span>
 *     </label>
 *   </fieldset>
 */
export function radioGroupClass(
	size: RadioGroupSize = "md",
	variant: RadioGroupVariant = "default",
) {
	return variant === "card"
		? `rx-radio-group rx-radio-group-${size} rx-radio-group-card`
		: `rx-radio-group rx-radio-group-${size}`;
}

/** Class names for the parts of a RadioGroup, for markup written by hand. */
export const radioGroupParts = {
	/** One option: a `<label>` around the circle and its text, so the whole row checks it. */
	item: "rx-radio-item",
	/** The drawn circle. Its dot is `::after`, or the group's gliding dot where anchors exist. */
	radio: "rx-radio",
	/** The native radio. Invisible, it covers the circle and a 24px target around it. */
	input: "rx-radio-input",
	/** The label text and the description, stacked. */
	text: "rx-radio-text",
	/** A quieter line under the label, announced as the description. */
	description: "rx-radio-description",
} as const;
