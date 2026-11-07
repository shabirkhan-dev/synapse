export type SliderSize = "sm" | "md" | "lg";
export type SliderVariant = "default" | "ruler";
export type SliderOrientation = "horizontal" | "vertical";

export const sliderSizes = ["sm", "md", "lg"] as const satisfies readonly SliderSize[];
export const sliderVariants = ["default", "ruler"] as const satisfies readonly SliderVariant[];

/**
 * The class list for a Slider. The look and the motion live in `slider.css` (your global CSS, when
 * installed from the registry), so React and plain HTML get the same slider from these names. The
 * fill and the bubbles read `--_lo`, `--_hi` and `--_p` (numbers from 0 to 1) from inline styles:
 *
 *   <div class="rx-slider rx-slider-md" data-orientation="horizontal" style="--_lo: 0; --_hi: 0.4">
 *     <div class="rx-slider-control">
 *       <input type="range" class="rx-slider-input" value="40" aria-label="Volume" />
 *     </div>
 *   </div>
 */
export function sliderClass(size: SliderSize = "md", variant: SliderVariant = "default") {
	return variant === "ruler"
		? `rx-slider rx-slider-${size} rx-slider-ruler`
		: `rx-slider rx-slider-${size}`;
}

/** Class names for the parts of a Slider, for markup written by hand. */
export const sliderParts = {
	/** Holds the overlaid native ranges, the bubbles and the scale; it is what the thumbs travel. */
	control: "rx-slider-control",
	/** A native `<input type="range">`: its track draws the fill, its thumb is the handle. */
	input: "rx-slider-input",
	/** The value over a thumb (`--_p`), on hover, focus and drag, or always. Decorative. */
	bubble: "rx-slider-bubble",
	/** The ruler variant's tick scale under the needle. Decorative. */
	scale: "rx-slider-scale",
	/** The row of marks and their labels under the track. Decorative; the datalist is the data. */
	marks: "rx-slider-marks",
	/** One mark at `--_p`; `data-in` when it sits inside the filled part. */
	mark: "rx-slider-mark",
	/** The ruler variant's large readout above the scale. */
	readout: "rx-slider-readout",
} as const;
