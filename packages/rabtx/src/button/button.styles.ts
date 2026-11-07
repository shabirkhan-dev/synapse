export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";
export type ButtonState = "idle" | "loading" | "success" | "error";

export const buttonVariants = [
	"primary",
	"secondary",
	"ghost",
	"outline",
] as const satisfies readonly ButtonVariant[];
export const buttonSizes = ["sm", "md", "lg", "icon"] as const satisfies readonly ButtonSize[];

type ButtonStyle = {
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** One of the special looks. `metallic` ignores `variant`. */
	look?: "magnetic" | "metallic";
};

/**
 * The class list for a Button. The look lives in `button.css` (your global CSS, when installed from
 * the registry): tones, sizes, press, hover, ripple and label swaps. So React, Solid and plain HTML
 * all get the same button from these names:
 *
 *   <button class="rx-btn rx-btn-primary rx-btn-md">Save</button>
 */
export function buttonClass({ variant = "primary", size = "md", look }: ButtonStyle = {}) {
	const tone = look === "metallic" ? "rx-btn-metal" : `rx-btn-${variant}`;
	return `rx-btn ${tone} rx-btn-${size}${look === "magnetic" ? " rx-btn-magnet" : ""}`;
}

/** Class names for the parts inside a Button, for markup written by hand. */
export const buttonParts = {
	/** Holds the ripples; clipped to the button's shape. */
	ripples: "rx-btn-ripples",
	ripple: "rx-btn-ripple",
	/** An icon that widens in and out next to the label. Shown with `data-shown`. */
	slot: "rx-btn-slot",
	/** The built-in status glyphs: add `data-glyph="spinner" | "check" | "cross"`. */
	glyph: "rx-btn-glyph",
	/** The label box. Its width follows `--_btn-text-w` so a label swap resizes smoothly. */
	text: "rx-btn-text",
	/** One label. `data-enter` rolls it in letter by letter, `data-exit` rolls it out. */
	label: "rx-btn-label",
	letter: "rx-btn-letter",
	srOnly: "rx-btn-sr",
	/** The chrome rim, its sweeping highlight, the face over them and the face's bevel. */
	metalRim: "rx-btn-metal-rim",
	metalSheen: "rx-btn-metal-sheen",
	metalFace: "rx-btn-metal-face",
	metalBevel: "rx-btn-metal-bevel",
	content: "rx-btn-content",
} as const;
