import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../field";
import { SPRINGS } from "../motion";
import { Switch } from "./switch";
import { switchClass, switchParts, switchSizes } from "./switch.styles";

const css = readFileSync(new URL("../styles/switch.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("switchClass", () => {
	it("defaults to medium and names every size", () => {
		expect(switchClass()).toBe("rx-switch rx-switch-md");
		for (const size of switchSizes) expect(switchClass(size)).toBe(`rx-switch rx-switch-${size}`);
	});

	it("has a rule in switch.css for every class it can return", () => {
		const names = [
			"rx-switch",
			...switchSizes.filter((size) => size !== "md").map((size) => `rx-switch-${size}`),
			...Object.values(switchParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});
});

describe("switch.css", () => {
	it("draws a native checkbox with no system look", () => {
		expect(css).toMatch(/\.rx-switch \{[^}]*appearance: none;/);
	});

	it("moves the thumb on the switch spring, in CSS only", () => {
		expect(SPRINGS.switch).toEqual({ stiffness: 800, damping: 80, mass: 4 });
		for (const prop of ["inset-inline-start", "width", "scale"]) {
			expect(css).toContain(`${prop} var(--spring-switch-duration) var(--spring-switch)`);
		}
		expect(css).toMatch(/&:checked \{[^}]*--_x: var\(--_travel\);/);
	});

	it("stretches and squishes the thumb on press, toward where it is going", () => {
		expect(css).toMatch(
			/:is\(\.rx-switch:active, \.rx-switch-label:active > \.rx-switch\):not\(:disabled\) \{\s*--_grow: var\(--_stretch\);\s*--_squish: 0\.9;/,
		);
		expect(css).toContain("--_x: calc(var(--_travel) - var(--_stretch));");
	});

	it("places the thumb with a logical inset, so right-to-left text mirrors it", () => {
		expect(css).toContain("inset-inline-start: calc(var(--_pad) - 1px + var(--_x));");
		expect(css).not.toMatch(/translate:|:dir\(/);
	});

	it("honours reduced motion and the motion-off mode", () => {
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toMatch(
			/\[data-motion="off"\] \.rx-switch,\s*\[data-motion="off"\] \.rx-switch::before \{\s*transition: none;/,
		);
	});

	it("drops the recess and the thumb ring in Flat", () => {
		expect(css).toMatch(/\[data-depth="flat"\] \.rx-switch \{[^}]*--_knob-ring: transparent;/);
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});

describe("Switch", () => {
	it("renders a native checkbox with the switch role and attribute", () => {
		expect(html(<Switch aria-label="Wi-Fi" />)).toBe(
			'<input aria-label="Wi-Fi" switch="" type="checkbox" role="switch" class="rx-switch rx-switch-md"/>',
		);
	});

	it("leaves the checked state native, with no aria-checked to drift", () => {
		const on = html(<Switch aria-label="x" defaultChecked />);
		expect(on).toContain('checked=""');
		expect(on).not.toContain("aria-checked");
		expect(html(<Switch aria-label="x" checked onCheckedChange={() => {}} />)).toContain(
			'checked=""',
		);
	});

	it("takes a size, a className and native attributes", () => {
		const markup = html(
			<Switch aria-label="x" size="lg" className="ml-2" name="wifi" value="on" disabled />,
		);
		expect(markup).toContain('class="rx-switch rx-switch-lg ml-2"');
		expect(markup).toContain('name="wifi"');
		expect(markup).toContain('disabled=""');
	});

	it("wraps itself and its text in a label, with className on the label", () => {
		expect(
			html(
				<Switch size="sm" className="w-full">
					Airplane mode
				</Switch>,
			),
		).toBe(
			'<label class="rx-switch-label w-full"><input switch="" type="checkbox" role="switch" class="rx-switch rx-switch-sm"/>Airplane mode</label>',
		);
	});

	it("takes its id, description and invalid state from a Field", () => {
		const markup = html(
			<Field label="Accept the terms" error="Required">
				<Switch />
			</Field>,
		);
		const id = markup.match(/<input id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		expect(markup).toContain(`for="${id}"`);
		expect(markup).toContain('aria-invalid="true"');
		expect(markup).toMatch(/aria-describedby="[^"]+-message"/);
	});

	it("lets explicit props win over the Field", () => {
		const markup = html(
			<Field label="A" hint="B">
				<Switch id="own" />
			</Field>,
		);
		expect(markup).toContain('id="own"');
	});
});
