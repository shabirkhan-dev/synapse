import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Field } from "../field";
import { Textarea } from "./textarea";
import { textareaClass } from "./textarea.styles";

const css = readFileSync(new URL("../styles/textarea.css", import.meta.url), "utf8");

describe("Textarea", () => {
	it("is a native textarea drawn by textarea.css", () => {
		expect(textareaClass).toBe("rx-textarea");
		expect(css).toMatch(/^@layer components \{\s*\.rx-textarea \{/m);
		expect(renderToStaticMarkup(<Textarea aria-label="Notes" className="h-40" />)).toBe(
			'<textarea aria-label="Notes" class="rx-textarea h-40"></textarea>',
		);
	});

	it("grows with its text and shows focus and errors like the Input", () => {
		expect(css).toContain("field-sizing: content");
		expect(css).toContain("min-height: 6rem");
		expect(css).toContain("&:focus-visible");
		expect(css).toContain('&:is([aria-invalid="true"], :user-invalid)');
	});

	it("takes its id, description and invalid state from a Field", () => {
		const markup = renderToStaticMarkup(
			<Field label="Notes" error="Too long">
				<Textarea />
			</Field>,
		);
		expect(markup).toMatch(/<textarea id="[^"]+" aria-describedby="[^"]+" aria-invalid="true"/);
	});
});
