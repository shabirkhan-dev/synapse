import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../field";
import { Checkbox } from "./checkbox";
import { checkboxClass, checkboxParts, checkboxPaths, checkboxSizes } from "./checkbox.styles";

const css = readFileSync(new URL("../styles/checkbox.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("checkboxClass", () => {
	it("defaults to medium and names every size", () => {
		expect(checkboxClass()).toBe("rx-checkbox rx-checkbox-md");
		for (const size of checkboxSizes)
			expect(checkboxClass(size)).toBe(`rx-checkbox rx-checkbox-${size}`);
	});

	it("has a rule in checkbox.css for every class it can return", () => {
		const names = [
			"rx-checkbox",
			...checkboxSizes.filter((size) => size !== "md").map((size) => `rx-checkbox-${size}`),
			...Object.values(checkboxParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[]`));
	});
});

describe("checkbox.css", () => {
	it("reads the input's state with :has(), so the box needs no JavaScript state", () => {
		expect(css).toContain("&:has(> :checked),");
		expect(css).toContain("&:has(> :indeterminate)");
		expect(css).toContain("&:has(> :focus-visible)");
		expect(css).toContain('&:has(> [aria-invalid="true"]:not(:checked, :indeterminate))');
	});

	it("draws the glyph with stroke-dashoffset on the check spring and presses on the press spring", () => {
		expect(css).toContain("stroke-dasharray: 1;");
		expect(css).toContain("stroke-dashoffset var(--_draw) var(--spring-check) 40ms");
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

describe("Checkbox", () => {
	it("renders a native checkbox inside the box, with both glyphs hidden from readers", () => {
		const markup = html(<Checkbox aria-label="Agree" id="c" />);
		expect(markup).toBe(
			`<span class="rx-checkbox rx-checkbox-md"><input aria-label="Agree" id="c" type="checkbox" class="rx-checkbox-input"/><svg class="rx-checkbox-mark rx-checkbox-check" viewBox="0 0 24 24" aria-hidden="true"><path d="${checkboxPaths.check}" pathLength="1"></path></svg><svg class="rx-checkbox-mark rx-checkbox-dash" viewBox="0 0 24 24" aria-hidden="true"><path d="${checkboxPaths.dash}" pathLength="1"></path></svg></span>`,
		);
	});

	it("puts size and className on the box when bare, and on the label with children", () => {
		expect(html(<Checkbox aria-label="x" size="lg" className="m-2" />)).toContain(
			'<span class="rx-checkbox rx-checkbox-lg m-2">',
		);
		const labelled = html(
			<Checkbox size="sm" className="m-2">
				Agree
			</Checkbox>,
		);
		expect(labelled).toMatch(
			/^<label class="rx-checkbox-label m-2"><span class="rx-checkbox rx-checkbox-sm">/,
		);
		expect(labelled).toContain('<span class="rx-checkbox-text"><span>Agree</span></span></label>');
	});

	it("maps checked, defaultChecked and the indeterminate string to the native state", () => {
		expect(html(<Checkbox aria-label="x" checked onCheckedChange={() => {}} />)).toContain(
			'checked=""',
		);
		expect(html(<Checkbox aria-label="x" defaultChecked />)).toContain('checked=""');
		expect(html(<Checkbox aria-label="x" checked="indeterminate" />)).not.toContain("checked=");
	});

	it("names it by the label text and describes it with the description", () => {
		const markup = html(
			<Checkbox id="n" description="Replies on your threads.">
				Comments
			</Checkbox>,
		);
		expect(markup).toContain('aria-describedby="n-description"');
		expect(markup).toContain('aria-labelledby="n-label"');
		expect(markup).toContain('<span id="n-label">Comments</span>');
		expect(markup).toContain(
			'<span id="n-description" class="rx-checkbox-description">Replies on your threads.</span>',
		);
	});

	it("takes its id, description and invalid state from a Field", () => {
		const markup = html(
			<Field label="Terms" error="Accept the terms to continue.">
				<Checkbox />
			</Field>,
		);
		const id = markup.match(/<input id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		expect(markup).toContain(`for="${id}"`);
		expect(markup).toContain('aria-invalid="true"');
		expect(markup).toContain(`aria-describedby="${id}-message"`);
	});

	it("can be disabled and named", () => {
		const markup = html(
			<Checkbox disabled name="beta" value="on">
				Beta
			</Checkbox>,
		);
		expect(markup).toContain('disabled=""');
		expect(markup).toContain('name="beta"');
	});
});
