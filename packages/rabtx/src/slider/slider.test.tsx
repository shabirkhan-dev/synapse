import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../field";
import { SPRINGS } from "../motion";
import { Slider } from "./slider";
import { sliderClass, sliderParts, sliderSizes, sliderVariants } from "./slider.styles";

const css = readFileSync(new URL("../styles/slider.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const inputs = (markup: string) => markup.match(/<input [^>]*>/g) ?? [];

describe("sliderClass", () => {
	it("defaults to medium and the plain variant, and names every size and variant", () => {
		expect(sliderClass()).toBe("rx-slider rx-slider-md");
		for (const size of sliderSizes) expect(sliderClass(size)).toBe(`rx-slider rx-slider-${size}`);
		expect(sliderClass("lg", "ruler")).toBe("rx-slider rx-slider-lg rx-slider-ruler");
		expect(sliderVariants).toEqual(["default", "ruler"]);
	});

	it("has a rule in slider.css for every class it can return", () => {
		const names = [
			"rx-slider",
			"rx-slider-ruler",
			"rx-slider-layer",
			"rx-slider-track",
			...sliderSizes.filter((size) => size !== "md").map((size) => `rx-slider-${size}`),
			...Object.values(sliderParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});
});

describe("slider.css", () => {
	it("draws native ranges with no system look, in WebKit and Firefox", () => {
		expect(css).toMatch(/\.rx-slider-input \{[^}]*appearance: none;/);
		for (const pseudo of [
			"::-webkit-slider-runnable-track",
			"::-webkit-slider-thumb",
			"::-moz-range-track",
			"::-moz-range-thumb",
		])
			expect(css).toContain(`&${pseudo} {`);
	});

	it("fills the rail from CSS variables, lined up with the native thumb's centre", () => {
		expect(css).toContain("--_to: calc(var(--_thumb) / 2 + (100% - var(--_thumb)) * var(--_hi));");
		expect(css).toContain(
			"--_from: calc(var(--_thumb) / 2 + (100% - var(--_thumb)) * var(--_lo));",
		);
		expect(css).toMatch(/--_rail-bg: linear-gradient\(\s*var\(--_dir\),/);
	});

	it("lets a range's inputs take the pointer only on their thumbs", () => {
		expect(css).toMatch(/\[data-range\] & \{\s*pointer-events: none;/);
		expect(css).toMatch(/&::-webkit-slider-thumb \{[^}]*pointer-events: auto;/);
	});

	it("grows the thumb on the press spring and pops the bubble on the swap spring", () => {
		expect(SPRINGS.press).toEqual({ stiffness: 500, damping: 30, mass: 0.6 });
		expect(css).toContain("transform var(--spring-press-duration) var(--spring-press)");
		expect(css).toMatch(
			/\.rx-slider-input:active:not\(:disabled\),[^{]*\{\s*--_sx: 1\.2;\s*--_sy: 1\.2;/,
		);
		expect(css).toContain("scale var(--spring-swap-duration) var(--spring-swap)");
	});

	it("stands up with the native vertical writing mode", () => {
		expect(css).toMatch(/writing-mode: vertical-lr;\s*direction: rtl;/);
	});

	it("honours reduced motion and the motion-off mode in the rx-motion layer", () => {
		const motion = css.slice(css.indexOf("@layer rx-motion"));
		expect(motion).toContain("@media (prefers-reduced-motion: reduce)");
		expect(motion).toMatch(
			/\[data-motion="off"\] \.rx-slider-input::-webkit-slider-thumb \{\s*transition: none;/,
		);
		expect(css.slice(0, css.indexOf("@layer rx-motion"))).not.toMatch(/data-motion|reduced-motion/);
	});

	it("drops the recess and the thumb ring in Flat, and has no cast shadow", () => {
		expect(css).toMatch(/\[data-depth="flat"\] \.rx-slider \{[^}]*--_edge-a: transparent;/);
		expect(css).toMatch(
			/\[data-depth="flat"\] \.rx-slider-input \{[^}]*--_knob-ring: transparent;/,
		);
		expect(css).not.toMatch(/box-shadow:[^;]*\d+px \d+px/);
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
		expect(css).not.toContain("!important");
	});
});

describe("Slider", () => {
	it("renders one native range with the value written as CSS variables", () => {
		const markup = html(<Slider aria-label="Volume" defaultValue={[40]} />);
		expect(inputs(markup)).toHaveLength(1);
		expect(markup).toContain('style="--_lo:0;--_hi:0.4"');
		expect(markup).toMatch(
			/<input type="range"[^>]*min="0" max="100" step="1" aria-label="Volume" value="40"\/>/,
		);
		expect(markup).toContain('data-orientation="horizontal"');
		expect(markup).not.toContain("data-range");
	});

	it("defaults to the minimum", () => {
		expect(html(<Slider aria-label="x" min={10} max={20} />)).toContain('value="10"');
	});

	it("renders a range as one named input per thumb on a shared track", () => {
		const markup = html(<Slider aria-label="Price" defaultValue={[20, 80]} name="price" />);
		const [low = "", high = ""] = inputs(markup);
		expect(markup).toContain("data-range");
		expect(markup).toContain('style="--_lo:0.2;--_hi:0.8"');
		expect(markup).toContain('class="rx-slider-track"');
		expect(low).toContain('aria-label="Price Minimum"');
		expect(high).toContain('aria-label="Price Maximum"');
		expect(low).toContain('name="price"');
		expect(high).toContain('name="price"');
	});

	it("takes its own thumb names", () => {
		const [a = "", b = ""] = inputs(
			html(<Slider defaultValue={[1, 5]} max={10} thumbLabels={["From", "To"]} />),
		);
		expect(a).toContain('aria-label="From"');
		expect(b).toContain('aria-label="To"');
	});

	it("is named, described and marked invalid by a Field", () => {
		const markup = html(
			<Field label="Budget" error="Too low">
				<Slider defaultValue={[10]} />
			</Field>,
		);
		const id = markup.match(/<input type="range" id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		expect(markup).toContain(`for="${id}"`);
		expect(markup).toContain('aria-invalid="true"');
		expect(markup).toMatch(/aria-describedby="[^"]+-message"/);
	});

	it("names each range thumb by the Field label and its own name", () => {
		const markup = html(
			<Field label="Price">
				<Slider defaultValue={[10, 90]} />
			</Field>,
		);
		const labelId = markup.match(/<label id="([^"]+)"/)?.[1];
		const [low = "", high = ""] = inputs(markup);
		const lowId = low.match(/id="([^"]+)"/)?.[1];
		const highId = high.match(/id="([^"]+)"/)?.[1];
		expect(low).toContain(`aria-labelledby="${labelId} ${lowId}"`);
		expect(high).toContain(`aria-labelledby="${labelId} ${highId}"`);
		expect(low).toContain('aria-label="Minimum"');
	});

	it("reads formatted values to screen readers and shows them in bubbles", () => {
		const markup = html(
			<Slider aria-label="Opacity" defaultValue={[70]} showValue formatValue={(v) => `${v}%`} />,
		);
		expect(markup).toContain('aria-valuetext="70%"');
		expect(markup).toContain('data-show-value=""');
		expect(markup).toMatch(
			/<span class="rx-slider-bubble" aria-hidden="true" style="--_p:0.7">70%<\/span>/,
		);
		expect(html(<Slider aria-label="x" showValue="always" />)).toContain(
			'data-show-value="always"',
		);
	});

	it("lists marks in a datalist and draws them, inside or outside the fill", () => {
		const markup = html(
			<Slider
				aria-label="Quality"
				defaultValue={[50]}
				step={25}
				marks={[{ value: 0, label: "Low" }, 50, 100, 150]}
			/>,
		);
		const list = markup.match(/<datalist id="([^"]+)">/)?.[1];
		expect(list).toBeTruthy();
		expect(markup).toContain(`list="${list}"`);
		expect(markup).toContain('<option value="0">Low</option>');
		// Out of range marks are dropped.
		expect(markup).not.toContain('value="150"');
		expect(markup).toContain('data-labels=""');
		expect(markup).toMatch(/class="rx-slider-mark" data-in="" style="--_p:0"><span>Low<\/span>/);
		expect(markup).toContain('class="rx-slider-mark" style="--_p:1"');
	});

	it("marks every step, but not past a hundred", () => {
		expect(html(<Slider aria-label="x" max={10} marks />).match(/<option /g)).toHaveLength(11);
		expect(html(<Slider aria-label="x" max={1000} marks />)).not.toContain("<datalist");
		expect(html(<Slider aria-label="x" max={1} step={0.1} marks />)).toContain(
			'<option value="0.3">0.3</option>',
		);
	});

	it("draws the ruler: a readout and a tick scale with at most a hundred ticks", () => {
		const markup = html(
			<Slider
				variant="ruler"
				aria-label="Weight"
				defaultValue={[72.5]}
				min={40}
				max={120}
				step={0.5}
				formatValue={(v) => `${v} kg`}
			/>,
		);
		expect(markup).toContain('class="rx-slider rx-slider-md rx-slider-ruler"');
		expect(markup).toContain('<div class="rx-slider-readout" aria-hidden="true">72.5 kg</div>');
		expect(markup).toContain('class="rx-slider-scale" aria-hidden="true" style="--_ticks:80"');
	});

	it("passes orientation, size, disabled, form and className through", () => {
		const markup = html(
			<Slider aria-label="x" orientation="vertical" size="lg" disabled form="f" className="h-40" />,
		);
		expect(markup).toContain('class="rx-slider rx-slider-lg h-40"');
		expect(markup).toContain('data-orientation="vertical"');
		expect(markup).toContain('aria-orientation="vertical"');
		expect(markup).toContain('data-disabled=""');
		expect(markup).toContain('disabled=""');
		expect(markup).toContain('form="f"');
	});
});
