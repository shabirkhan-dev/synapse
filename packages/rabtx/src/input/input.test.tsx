import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../field";
import { Input, PasswordInput } from "./input";
import { InputOTP } from "./input-otp";
import {
	cleanCode,
	inputClass,
	inputParts,
	inputSizes,
	inputVariants,
	otpClass,
	otpParts,
} from "./input.styles";

const css = readFileSync(new URL("../styles/input.css", import.meta.url), "utf8");
const select = readFileSync(new URL("../styles/select.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
/** The `--_h` of the base rule and the sm and lg rules for a class prefix. */
const heights = (text: string, prefix: string) =>
	["", "-sm", "-lg"].map(
		(suffix) => text.match(new RegExp(`\\.${prefix}${suffix} \\{[^}]*?--_h: ([\\d.]+rem)`))?.[1],
	);

describe("inputClass", () => {
	it("defaults to a medium outline field and names every size and variant", () => {
		expect(inputClass()).toBe("rx-input-field rx-input-md");
		for (const size of inputSizes) {
			expect(inputClass({ size })).toBe(`rx-input-field rx-input-${size}`);
		}
		expect(inputClass({ variant: "filled", pill: true })).toBe(
			"rx-input-field rx-input-md rx-input-filled rx-input-pill",
		);
		expect(inputVariants).toEqual(["outline", "filled"]);
	});

	it("has a rule in input.css for every class it can return", () => {
		const names = [
			"rx-input-field",
			...inputSizes.filter((size) => size !== "md").map((size) => `rx-input-${size}`),
			"rx-input-filled",
			"rx-input-pill",
			...Object.values(inputParts),
			...inputSizes.filter((size) => size !== "md").map((size) => `rx-otp-${size}`),
			...Object.values(otpParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});

	it("uses the Select trigger's heights, edge, fill and radius, so the two line up", () => {
		expect(heights(css, "rx-input-field")[0]).toBe("2.5rem");
		expect(heights(css, "rx-input").slice(1)).toEqual(["2rem", "3rem"]);
		expect(heights(select, "rx-select").slice(1)).toEqual(["2rem", "3rem"]);
		for (const rule of [
			"border: 1px solid var(--input)",
			"--_r: var(--radius-box)",
			"var(--card)",
			"box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 20%, transparent)",
		]) {
			expect(css, rule).toContain(rule);
			expect(select, rule).toContain(rule);
		}
	});
});

describe("input.css", () => {
	it("reads native state: focus-visible, aria-invalid or user-invalid, placeholder-shown", () => {
		expect(css).toContain("&:has(.rx-input:focus-visible)");
		expect(css).toContain('&:has(.rx-input:is([aria-invalid="true"], :user-invalid))');
		expect(css).toContain(".rx-input:is(:placeholder-shown, :read-only)) .rx-input-clear");
		expect(css).toContain(
			".rx-input:is(:focus, :not(:placeholder-shown), :autofill) + .rx-input-label",
		);
	});

	it("moves on the existing springs only, with keyframes for the shake, tick and roll", () => {
		expect(css).toContain("var(--spring-label-duration) var(--spring-label)");
		expect(css).toContain("var(--spring-swap-duration) var(--spring-swap)");
		for (const name of ["rx-input-shake", "rx-input-draw", "rx-otp-roll", "rx-otp-blink"]) {
			expect(css).toContain(`@keyframes ${name}`);
		}
	});

	it("honours reduced motion and the motion-off mode, and flattens the filled variant", () => {
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toContain('[data-motion="off"]');
		expect(css).toContain('[data-depth="flat"] .rx-input-filled');
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});

describe("Input", () => {
	it("renders a native input inside the wrapper", () => {
		expect(html(<Input aria-label="Name" />)).toBe(
			'<div class="rx-input-field rx-input-md"><input aria-label="Name" class="rx-input"/></div>',
		);
	});

	it("puts size, variant, pill and className on the wrapper", () => {
		expect(
			html(<Input aria-label="x" size="lg" variant="filled" pill className="w-64" />),
		).toContain('class="rx-input-field rx-input-lg rx-input-filled rx-input-pill w-64"');
	});

	it("hides decorative icons and keeps addons readable, in order", () => {
		const markup = html(
			<Input
				aria-label="Site"
				startAddon="https://"
				leadingIcon={<svg />}
				trailingIcon={<svg />}
				endAddon=".com"
			/>,
		);
		expect(markup).toMatch(
			/^<div[^>]*><span class="rx-input-addon">https:\/\/<\/span><span class="rx-input-icon" aria-hidden="true"><svg><\/svg><\/span><input[^>]*\/><span class="rx-input-icon" aria-hidden="true"><svg><\/svg><\/span><span class="rx-input-addon">.com<\/span><\/div>$/,
		);
	});

	it("gives a clearable input a placeholder and a named clear button after it", () => {
		const markup = html(<Input aria-label="Search" clearable />);
		expect(markup).toContain('placeholder=" "');
		expect(markup).toContain(
			'<button type="button" aria-label="Clear" class="rx-input-action rx-input-clear">',
		);
		expect(html(<Input aria-label="Search" clearable placeholder="Find" />)).toContain(
			'placeholder="Find"',
		);
	});

	it("links a floating label to the input that comes right before it", () => {
		const markup = html(<Input label="Email" type="email" />);
		const id = markup.match(/<input id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		expect(markup).toContain(
			`<span class="rx-input-float"><input id="${id}" type="email" placeholder=" " class="rx-input"/><label for="${id}" class="rx-input-label">Email</label></span>`,
		);
	});

	it("draws a success tick with a unit path length", () => {
		expect(html(<Input aria-label="Handle" success />)).toContain(
			'class="rx-input-icon rx-input-check" aria-hidden="true"',
		);
		expect(html(<Input aria-label="Handle" success />)).toContain('pathLength="1"');
	});

	it("takes its id, description and invalid state from a Field", () => {
		const markup = html(
			<Field label="Email" error="Required">
				<Input />
			</Field>,
		);
		const id = markup.match(/<input id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		expect(markup).toContain(`for="${id}"`);
		expect(markup).toContain('aria-invalid="true"');
		expect(markup).toMatch(/aria-describedby="[^"]+-message"/);
	});
});

describe("PasswordInput", () => {
	it("starts hidden with an unpressed, named eye that holds both glyphs", () => {
		const markup = html(<PasswordInput aria-label="Password" />);
		expect(markup).toContain('type="password"');
		expect(markup).toContain('autoComplete="current-password"');
		expect(markup).toContain(
			'<button type="button" aria-label="Show password" aria-pressed="false" class="rx-input-action rx-input-reveal">',
		);
		expect(markup).toContain('data-when="hidden"');
		expect(markup).toContain('data-when="shown"');
	});

	it("disables the eye with the input", () => {
		expect(html(<PasswordInput aria-label="Password" disabled />)).toMatch(
			/aria-pressed="false" disabled=""/,
		);
	});
});

describe("InputOTP", () => {
	it("is one native input with one-time-code autofill over aria-hidden slots", () => {
		const markup = html(<InputOTP defaultValue="12" />);
		expect(markup).toContain('aria-label="One-time code"');
		expect(markup).toContain('autoComplete="one-time-code"');
		expect(markup).toContain('inputMode="numeric"');
		expect(markup).toContain('pattern="\\d{6}"');
		expect(markup).toContain('maxLength="6"');
		expect(markup).toContain('value="12"');
		expect(markup).toContain('<div class="rx-otp-slots" aria-hidden="true">');
		expect(markup.match(/class="rx-otp-slot"/g)).toHaveLength(6);
		expect(markup.match(/data-filled=""/g)).toHaveLength(2);
	});

	it("puts the ring and caret on the next slot to type", () => {
		const markup = html(<InputOTP length={4} defaultValue="123" />);
		expect(markup).toContain('style="--_at:3"');
		expect(markup).toMatch(/<span class="rx-otp-slot" data-active=""><\/span><\/div>/);
		expect(html(<InputOTP length={4} defaultValue="1234" />)).toContain('style="--_at:3"');
	});

	it("masks characters and takes a Field's wiring instead of its own name", () => {
		const masked = html(<InputOTP length={2} defaultValue="98" mask />);
		expect(masked).toContain("•");
		expect(masked).not.toContain(">9<");
		const inField = html(
			<Field label="Code" hint="Sent by SMS">
				<InputOTP />
			</Field>,
		);
		expect(inField).not.toContain("One-time code");
		expect(inField).toMatch(/<input id="[^"]+" aria-describedby="[^"]+-message"/);
	});

	it("uses the size classes", () => {
		expect(otpClass()).toBe("rx-otp rx-otp-md");
		expect(html(<InputOTP size="lg" className="mx-auto" />)).toContain(
			'class="rx-otp rx-otp-lg mx-auto"',
		);
	});
});

describe("cleanCode", () => {
	it("keeps only the allowed characters, up to the length", () => {
		expect(cleanCode("12-34 56 78", 6)).toBe("123456");
		expect(cleanCode("ab-12_cd", 5, "alphanumeric")).toBe("ab12c");
		expect(cleanCode("", 6)).toBe("");
	});
});
