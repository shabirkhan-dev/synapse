import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../field";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import {
	radioGroupClass,
	radioGroupParts,
	radioGroupSizes,
	radioGroupVariants,
} from "./radio-group.styles";

const css = readFileSync(new URL("../styles/radio-group.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const inputs = (markup: string) => markup.match(/<input [^>]*>/g) ?? [];

describe("radioGroupClass", () => {
	it("defaults to medium and the plain variant, and names every size and variant", () => {
		expect(radioGroupClass()).toBe("rx-radio-group rx-radio-group-md");
		for (const size of radioGroupSizes)
			expect(radioGroupClass(size)).toBe(`rx-radio-group rx-radio-group-${size}`);
		expect(radioGroupClass("sm", "card")).toBe(
			"rx-radio-group rx-radio-group-sm rx-radio-group-card",
		);
		expect(radioGroupVariants).toEqual(["default", "card"]);
	});

	it("has a rule in radio-group.css for every class it can return", () => {
		const names = [
			"rx-radio-group",
			"rx-radio-group-card",
			...radioGroupSizes.filter((size) => size !== "md").map((size) => `rx-radio-group-${size}`),
			...Object.values(radioGroupParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[]`));
	});
});

describe("radio-group.css", () => {
	it("reads the input's state with :has(), so the circle needs no JavaScript state", () => {
		expect(css).toContain("&:has(> :checked) {");
		expect(css).toContain("&:has(> :focus-visible) {");
		expect(css).toContain("&:has(> :disabled) {");
		expect(css).toContain('.rx-radio-group[aria-invalid="true"]:not(:has(:checked)) .rx-radio {');
	});

	it("glides one dot to the checked circle with anchor positioning, on the glide spring", () => {
		expect(css).toContain("@supports (anchor-name: --a) and (anchor-scope: all)");
		expect(css).toContain("anchor-scope: --_radio-chosen;");
		expect(css).toContain("anchor-name: --_radio-chosen;");
		expect(css).toContain("top: anchor(center);");
		expect(css).toContain("top var(--spring-glide-duration) var(--spring-glide)");
	});

	it("pops each circle's own dot on the swap spring where anchors are missing, and presses", () => {
		expect(css).toContain("scale var(--spring-swap-duration) var(--spring-swap)");
		expect(css).toContain("scale var(--spring-press-duration) var(--spring-press)");
		expect(css).toContain("scale: 0.92;");
	});

	it("honours reduced motion and the motion-off mode", () => {
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toContain('[data-motion="off"]');
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});

describe("RadioGroup", () => {
	it("renders native radios sharing a name inside a fieldset with the radiogroup role", () => {
		const markup = html(
			<RadioGroup name="plan" aria-label="Plan">
				<RadioGroupItem value="free" id="a">
					Free
				</RadioGroupItem>
				<RadioGroupItem value="pro" id="b">
					Pro
				</RadioGroupItem>
			</RadioGroup>,
		);
		expect(markup).toBe(
			'<fieldset aria-label="Plan" role="radiogroup" data-orientation="vertical" class="rx-radio-group rx-radio-group-md">' +
				'<label class="rx-radio-item"><span class="rx-radio"><input id="a" type="radio" class="rx-radio-input" name="plan" value="free"/></span><span class="rx-radio-text"><span>Free</span></span></label>' +
				'<label class="rx-radio-item"><span class="rx-radio"><input id="b" type="radio" class="rx-radio-input" name="plan" value="pro"/></span><span class="rx-radio-text"><span>Pro</span></span></label>' +
				"</fieldset>",
		);
	});

	it("generates a shared name when none is given, so the arrow keys still group the options", () => {
		const markup = html(
			<RadioGroup aria-label="x">
				<RadioGroupItem value="a">A</RadioGroupItem>
				<RadioGroupItem value="b">B</RadioGroupItem>
			</RadioGroup>,
		);
		const names = inputs(markup).map((input) => input.match(/name="([^"]+)"/)?.[1]);
		expect(names[0]).toBeTruthy();
		expect(names[1]).toBe(names[0]);
	});

	it("checks the option matching value, or defaultValue when uncontrolled", () => {
		const controlled = inputs(
			html(
				<RadioGroup aria-label="x" value="b" onValueChange={() => {}}>
					<RadioGroupItem value="a">A</RadioGroupItem>
					<RadioGroupItem value="b">B</RadioGroupItem>
				</RadioGroup>,
			),
		);
		expect(controlled[0]).not.toContain("checked");
		expect(controlled[1]).toContain('checked=""');
		const uncontrolled = inputs(
			html(
				<RadioGroup aria-label="x" defaultValue="a">
					<RadioGroupItem value="a">A</RadioGroupItem>
					<RadioGroupItem value="b">B</RadioGroupItem>
				</RadioGroup>,
			),
		);
		expect(uncontrolled[0]).toContain('checked=""');
		expect(uncontrolled[1]).not.toContain("checked");
	});

	it("puts size, variant, orientation and className on the group", () => {
		const markup = html(
			<RadioGroup aria-label="x" size="lg" variant="card" orientation="horizontal" className="m-2">
				<RadioGroupItem value="a">A</RadioGroupItem>
			</RadioGroup>,
		);
		expect(markup).toMatch(
			/^<fieldset aria-label="x" role="radiogroup" data-orientation="horizontal" class="rx-radio-group rx-radio-group-lg rx-radio-group-card m-2">/,
		);
	});

	it("disables every option through the fieldset, and one option on its own", () => {
		expect(
			html(
				<RadioGroup aria-label="x" disabled>
					<RadioGroupItem value="a">A</RadioGroupItem>
				</RadioGroup>,
			),
		).toContain('<fieldset aria-label="x" disabled=""');
		const one = inputs(
			html(
				<RadioGroup aria-label="x">
					<RadioGroupItem value="a">A</RadioGroupItem>
					<RadioGroupItem value="b" disabled>
						B
					</RadioGroupItem>
				</RadioGroup>,
			),
		);
		expect(one[0]).not.toContain("disabled");
		expect(one[1]).toContain('disabled=""');
	});

	it("passes required and form to every option", () => {
		const markup = html(
			<RadioGroup aria-label="x" required form="signup">
				<RadioGroupItem value="a">A</RadioGroupItem>
				<RadioGroupItem value="b">B</RadioGroupItem>
			</RadioGroup>,
		);
		expect(markup).toContain('aria-required="true"');
		for (const input of inputs(markup)) {
			expect(input).toContain('required=""');
			expect(input).toContain('form="signup"');
		}
	});

	it("names an option by its label text and describes it with the description", () => {
		const markup = html(
			<RadioGroup aria-label="x">
				<RadioGroupItem value="once" id="n" description="Runs a single time.">
					Run once
				</RadioGroupItem>
			</RadioGroup>,
		);
		expect(markup).toContain('aria-labelledby="n-label"');
		expect(markup).toContain('aria-describedby="n-description"');
		expect(markup).toContain('<span id="n-label">Run once</span>');
		expect(markup).toContain(
			'<span id="n-description" class="rx-radio-description">Runs a single time.</span>',
		);
	});

	it("takes its id, name, description and invalid state from a Field", () => {
		const markup = html(
			<Field label="Plan" error="Choose a plan to continue.">
				<RadioGroup>
					<RadioGroupItem value="a">A</RadioGroupItem>
				</RadioGroup>
			</Field>,
		);
		const id = markup.match(/<fieldset id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		expect(markup).toContain(`<label id="${id}-label" for="${id}"`);
		expect(markup).toContain(`aria-labelledby="${id}-label"`);
		expect(markup).toContain(`aria-describedby="${id}-message"`);
		expect(markup).toContain('aria-invalid="true"');
	});

	it("throws when an option is used outside a group", () => {
		expect(() => html(<RadioGroupItem value="a">A</RadioGroupItem>)).toThrow(/inside a RadioGroup/);
	});
});
