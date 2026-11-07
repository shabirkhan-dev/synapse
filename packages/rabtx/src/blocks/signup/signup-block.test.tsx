import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordStrength, strengthLabels } from "./password-strength";
import { SigninBlock } from "./signin-block";
import { SignupBlock } from "./signup-block";
import { signupParts } from "./signup.styles";
import { validityMessage } from "./validity";

const css = readFileSync(new URL("../../styles/signup-block.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../../styles/index.css", import.meta.url), "utf8");

/** A ValidityState with the given flags on. */
function validity(flags: Partial<Record<keyof ValidityState, boolean>> = {}): ValidityState {
	const state = {
		badInput: false,
		customError: false,
		patternMismatch: false,
		rangeOverflow: false,
		rangeUnderflow: false,
		stepMismatch: false,
		tooLong: false,
		tooShort: false,
		typeMismatch: false,
		valueMissing: false,
		...flags,
	};
	return { ...state, valid: !Object.values(state).some(Boolean) } as ValidityState;
}

describe("passwordStrength", () => {
	it("is 0 when empty and weak under the minimum, however mixed", () => {
		expect(passwordStrength("")).toBe(0);
		expect(passwordStrength("aB3$")).toBe(1);
		expect(passwordStrength("x".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(1);
	});

	it("weighs length first and mixing only nudges it", () => {
		expect(passwordStrength("lowercase")).toBe(2);
		expect(passwordStrength("Lowercase1")).toBe(3);
		expect(passwordStrength("a much longer one")).toBe(4);
		expect(passwordStrength("twelve chars")).toBe(3);
	});

	it("keeps predictable passwords weak", () => {
		expect(passwordStrength("aaaaaaaaaaaa")).toBe(1);
		expect(passwordStrength("12345678abc")).toBe(1);
		expect(passwordStrength("password1234")).toBe(1);
	});

	it("has a label for every score", () => {
		expect(strengthLabels).toEqual(["", "Weak", "Fair", "Good", "Strong"]);
	});
});

describe("validityMessage", () => {
	it("is nothing for a valid control", () => {
		expect(validityMessage({ validity: validity(), validationMessage: "" })).toBeUndefined();
	});

	it("picks the first failing constraint, then the browser's own message", () => {
		const control = {
			validity: validity({ valueMissing: true, patternMismatch: true }),
			validationMessage: "Please fill out this field.",
		};
		expect(validityMessage(control, { valueMissing: "Enter your name." })).toBe("Enter your name.");
		expect(validityMessage(control, { patternMismatch: "Nope." })).toBe(
			"Please fill out this field.",
		);
		expect(
			validityMessage(
				{ validity: validity({ typeMismatch: true }), validationMessage: "" },
				{ typeMismatch: "Enter an email." },
			),
		).toBe("Enter an email.");
	});
});

describe("SignupBlock", () => {
	const html = renderToStaticMarkup(<SignupBlock />);

	it("renders the first step in a card: a form, labelled fields and native constraints", () => {
		expect(html).toContain('data-slot="card"');
		expect(html).toMatch(/<form[^>]*novalidate/i);
		for (const label of ["Full name", "Email", "Password", "Role", "Country"]) {
			expect(html).toContain(`>${label}</label>`);
		}
		const tag = (name: string) =>
			html.match(new RegExp(`<(?:input|select)[^>]*name="${name}"[^>]*>`))?.[0] ?? "";
		expect(tag("email")).toMatch(/type="email"/);
		expect(tag("email")).toMatch(/required/);
		expect(tag("name")).toMatch(/pattern=/);
		expect(tag("password")).toMatch(/minLength="8"/i);
		expect(tag("role")).toMatch(/required/);
		expect(tag("terms")).toMatch(/required/);
		expect(tag("updates")).toMatch(/role="switch"/);
		expect(html).toContain('type="submit"');
	});

	it("shows three steps with the first current, and a polite live region", () => {
		const steps = html.match(/data-state="(complete|current|upcoming)"/g);
		expect(steps).toEqual([
			'data-state="current"',
			'data-state="upcoming"',
			'data-state="upcoming"',
		]);
		expect(html).toContain('aria-current="step"');
		expect(html).toMatch(/aria-live="polite" aria-atomic="true"/);
		expect(html).toMatch(/<h3[^>]*tabindex="-1"[^>]*>Your details<\/h3>/i);
	});

	it("does not animate on load: data-moved only comes with the first step change", () => {
		expect(html).not.toContain("data-moved");
	});
});

describe("SigninBlock", () => {
	it("renders social buttons, email, password and remember me", () => {
		const html = renderToStaticMarkup(<SigninBlock />);
		expect(html).toContain(">Google<");
		expect(html).toContain(">GitHub<");
		expect(html).toMatch(/autoComplete="current-password"/i);
		expect(html).toMatch(/name="remember"/);
		expect(renderToStaticMarkup(<SigninBlock providers={[]} />)).not.toContain("Google");
	});
});

describe("signup-block.css", () => {
	it("is part of styles.css", () => {
		expect(index).toContain('@import "./signup-block.css";');
	});

	it("has a rule for every class the blocks use", () => {
		for (const name of Object.values(signupParts)) {
			expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
		}
	});

	it("animates steps only with @starting-style and stops for less motion", () => {
		expect(css).toContain("@starting-style");
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toContain('[data-motion="off"] .rx-signup .rx-signup-panel[data-leaving]');
	});

	it("is imported by no block file through a folder index (the registry copies files)", () => {
		for (const file of readdirSync(new URL(".", import.meta.url))) {
			if (!/\.tsx?$/.test(file)) continue;
			const code = readFileSync(new URL(file, import.meta.url), "utf8");
			for (const [, spec] of code.matchAll(/from "(\.\.\/\.\.\/[^"]+)"/g)) {
				expect(spec.split("/").length, `${file}: ${spec}`).toBe(4);
			}
		}
	});
});
