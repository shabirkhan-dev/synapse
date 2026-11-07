export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "outline" | "filled";

export const inputSizes = ["sm", "md", "lg"] as const satisfies readonly InputSize[];
export const inputVariants = ["outline", "filled"] as const satisfies readonly InputVariant[];

type InputStyle = {
	size?: InputSize;
	/** `outline` matches the Select trigger; `filled` is the recessed field. */
	variant?: InputVariant;
	/** Fully round, for search bars. Independent of the radius mode. */
	pill?: boolean;
};

/**
 * The class list for an Input's wrapper. The look lives in `input.css` (your global CSS, when
 * installed from the registry), so React and plain HTML get the same field from these names:
 *
 *   <div class="rx-input-field rx-input-md">
 *     <input class="rx-input" placeholder=" " />
 *   </div>
 */
export function inputClass({ size = "md", variant = "outline", pill }: InputStyle = {}) {
	return `rx-input-field rx-input-${size}${variant === "filled" ? " rx-input-filled" : ""}${pill ? " rx-input-pill" : ""}`;
}

/** Class names for the parts of an Input, for markup written by hand. */
export const inputParts = {
	/** The native `<input>`. Give it a placeholder (a space will do) so clear and float work. */
	input: "rx-input",
	/** A decorative icon at either end. */
	icon: "rx-input-icon",
	/** A text or control segment at either end, divided from the text by a line. */
	addon: "rx-input-addon",
	/** A small button on the trailing edge. */
	action: "rx-input-action",
	/** Add to an action to show it only while the input has a value. */
	clear: "rx-input-clear",
	/** Add to an action holding two icons (`data-when="hidden"` / `"shown"`), swapped by `aria-pressed`. */
	reveal: "rx-input-reveal",
	/** A tick that draws itself in; give its path `pathLength="1"`. */
	check: "rx-input-check",
	/** Wraps the input and its floating `<label>`, which comes right after the input. */
	float: "rx-input-float",
	label: "rx-input-label",
} as const;

/**
 * The class list for a one-time code. Markup:
 *
 *   <div class="rx-otp rx-otp-md" style="--_at: 0">
 *     <input class="rx-otp-input" autocomplete="one-time-code" maxlength="6" />
 *     <div class="rx-otp-slots" aria-hidden="true"><span class="rx-otp-slot" data-active></span>…</div>
 *     <span class="rx-otp-ring" aria-hidden="true"></span>
 *   </div>
 */
export function otpClass(size: InputSize = "md") {
	return `rx-otp rx-otp-${size}`;
}

/** Class names for the parts of a one-time code. */
export const otpParts = {
	/** The one real input, laid invisibly over the slots. */
	input: "rx-otp-input",
	slots: "rx-otp-slots",
	/** One character box. `data-filled` once it has one, `data-active` on the next to type. */
	slot: "rx-otp-slot",
	/** The character inside a slot; it rolls up when it mounts. */
	char: "rx-otp-char",
	/** The focus ring. It glides to the slot at `--_at` (a number on the root). */
	ring: "rx-otp-ring",
} as const;

export type OtpCharset = "digits" | "alphanumeric";

/** Keep only the characters a code may contain, up to its length. */
export function cleanCode(raw: string, length: number, charset: OtpCharset = "digits") {
	const kept = charset === "digits" ? raw.replace(/\D/g, "") : raw.replace(/[^a-z0-9]/gi, "");
	return kept.slice(0, length);
}
