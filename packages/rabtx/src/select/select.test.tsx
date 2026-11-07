import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../field";
import { Select, SelectGroup, SelectItem, SelectSeparator } from "./select";
import {
	chooseSide,
	estimateListHeight,
	selectClass,
	selectParts,
	selectSizes,
} from "./select.styles";

const css = readFileSync(new URL("../styles/select.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("selectClass", () => {
	it("defaults to medium and names every size", () => {
		expect(selectClass()).toBe("rx-select-field rx-select-md");
		for (const size of selectSizes)
			expect(selectClass(size)).toBe(`rx-select-field rx-select-${size}`);
	});

	it("has a rule in select.css for every class it can return", () => {
		const names = [
			"rx-select-field",
			...selectSizes.filter((size) => size !== "md").map((size) => `rx-select-${size}`),
			...Object.values(selectParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[]`));
	});
});

describe("select.css", () => {
	it("styles the list only where the customizable select exists", () => {
		expect(css).toMatch(
			/@supports \(appearance: base-select\) \{\s*\.rx-select,\s*\.rx-select::picker\(select\) \{\s*appearance: base-select;/,
		);
	});

	it("unfolds on the unfold spring and folds back on a short ease, keeping the list until it ends", () => {
		expect(css).toContain("rx-select-reveal var(--spring-unfold-duration) var(--spring-unfold)");
		expect(css).toContain("rx-select-fold 200ms");
		expect(css).toMatch(/display 200ms allow-discrete,\s*overlay 200ms allow-discrete/);
	});

	it("opens above with mirrored motion when the side says so", () => {
		expect(css).toContain('.rx-select[data-side="top"]::picker(select)');
		expect(css).toContain("position-area: block-start span-inline-end");
	});

	it("honours reduced motion and the motion-off mode", () => {
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toContain('[data-motion="off"]');
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});

describe("Select", () => {
	it("renders a native select inside the wrapper, with a hidden chevron after it", () => {
		const markup = html(
			<Select aria-label="Team" defaultValue="a">
				<SelectItem value="a">A</SelectItem>
			</Select>,
		);
		expect(markup).toBe(
			'<div class="rx-select-field rx-select-md"><select aria-label="Team" class="rx-select"><option value="a" selected="">A</option></select><span class="rx-select-chevron" aria-hidden="true"></span></div>',
		);
	});

	it("puts size and className on the wrapper", () => {
		expect(html(<Select aria-label="x" size="lg" className="w-64" />)).toContain(
			'class="rx-select-field rx-select-lg w-64"',
		);
	});

	it("shows a placeholder as a hidden, disabled first option chosen by default", () => {
		const markup = html(
			<Select aria-label="Plan" placeholder="Pick one">
				<SelectItem value="pro">Pro</SelectItem>
			</Select>,
		);
		expect(markup).toContain(
			'<option value="" disabled="" hidden="" selected="">Pick one</option>',
		);
	});

	it("makes room for a leading icon", () => {
		const markup = html(<Select aria-label="Lang" leadingIcon={<svg />} />);
		expect(markup).toContain(
			'<span class="rx-select-leading" aria-hidden="true"><svg></svg></span>',
		);
		expect(markup).toContain('data-leading=""');
	});

	it("takes its id, description and invalid state from a Field", () => {
		const markup = html(
			<Field label="Plan" error="Required">
				<Select>
					<SelectItem value="pro">Pro</SelectItem>
				</Select>
			</Field>,
		);
		const id = markup.match(/<select id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		expect(markup).toContain(`for="${id}"`);
		expect(markup).toContain('aria-invalid="true"');
		expect(markup).toMatch(/aria-describedby="[^"]+"/);
	});

	it("renders groups as optgroups and separators as hr", () => {
		const markup = html(
			<Select aria-label="Zone">
				<SelectGroup label="Asia">
					<SelectItem value="pkt">Karachi</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectItem value="gmt" disabled>
					London
				</SelectItem>
			</Select>,
		);
		expect(markup).toContain(
			'<optgroup label="Asia"><option value="pkt">Karachi</option></optgroup>',
		);
		expect(markup).toContain('<hr class="rx-select-separator"/>');
		expect(markup).toContain('<option value="gmt" disabled="">London</option>');
	});

	it("leaves item icons out of the server markup, so every browser hydrates the same options", () => {
		const markup = html(
			<Select aria-label="Theme">
				<SelectItem value="dark" icon={<svg />}>
					Dark
				</SelectItem>
			</Select>,
		);
		expect(markup).toContain('<option value="dark">Dark</option>');
		expect(markup).not.toContain(selectParts.itemIcon);
	});
});

describe("placement", () => {
	it("opens below when the list fits there", () => {
		expect(chooseSide({ above: 50, below: 400, height: 200 })).toBe("bottom");
	});

	it("opens above when it does not fit below and there is more room above", () => {
		expect(chooseSide({ above: 600, below: 150, height: 200 })).toBe("top");
	});

	it("stays below when neither side fits but below has more room", () => {
		expect(chooseSide({ above: 100, below: 150, height: 400 })).toBe("bottom");
	});

	it("estimates the list from its rows, group labels and separators", () => {
		expect(estimateListHeight({ options: 4 })).toBe(4 * 32 + 10);
		expect(estimateListHeight({ options: 5, groups: 2, separators: 1, row: 28 })).toBe(
			5 * 28 + 2 * 28 + 9 + 10,
		);
	});
});
