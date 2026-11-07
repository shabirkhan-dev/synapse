import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { collapsibleParts } from "./collapsible.styles";

const css = readFileSync(new URL("../styles/collapsible.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

const example = (props: Partial<React.ComponentProps<typeof Collapsible>> = {}) => (
	<Collapsible {...props}>
		<CollapsibleTrigger>More</CollapsibleTrigger>
		<CollapsibleContent>Hidden text</CollapsibleContent>
	</Collapsible>
);

describe("Collapsible", () => {
	it("is a details whose summary comes first, with a decorative chevron", () => {
		const markup = html(example());
		expect(markup).toMatch(
			/^<details data-slot="collapsible" data-state="closed" class="rx-collapsible">/,
		);
		expect(markup).toMatch(
			/<details[^>]*><summary id="[^"]+-trigger" data-slot="collapsible-trigger" data-state="closed" class="rx-collapsible-trigger">More<span class="rx-collapsible-chevron" aria-hidden="true"><\/span><\/summary>/,
		);
		expect(markup).toContain(
			'data-slot="collapsible-content" data-state="closed" class="rx-collapsible-content">Hidden text</div></details>',
		);
	});

	it("renders open from defaultOpen or a controlled open, so the server HTML is right", () => {
		expect(html(example({ defaultOpen: true }))).toMatch(
			/^<details data-slot="collapsible" open="" data-state="open"/,
		);
		expect(html(example({ open: true, onOpenChange: () => {} }))).toMatch(/^<details[^>]* open=""/);
		expect(html(example({ open: false, defaultOpen: true, onOpenChange: () => {} }))).not.toContain(
			'open=""',
		);
	});

	it("takes a disabled trigger out of the Tab order and says so", () => {
		const markup = html(example({ disabled: true }));
		expect(markup).toContain('data-disabled=""');
		expect(markup).toMatch(/<summary[^>]*aria-disabled="true"[^>]*tabindex="-1"/);
	});

	it("can leave the chevron out, and merges a className", () => {
		const markup = html(
			<Collapsible className="p-1">
				<CollapsibleTrigger chevron={false}>More</CollapsibleTrigger>
			</Collapsible>,
		);
		expect(markup).not.toContain(collapsibleParts.chevron);
		expect(markup).toContain('class="rx-collapsible p-1"');
	});

	it("needs a Collapsible around its parts", () => {
		expect(() => html(<CollapsibleTrigger>x</CollapsibleTrigger>)).toThrow(/inside <Collapsible>/);
	});
});

describe("collapsible.css", () => {
	it("has a rule for every part", () => {
		for (const name of Object.values(collapsibleParts))
			expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});

	it("grows ::details-content to auto with interpolate-size, keeping it rendered while it closes", () => {
		expect(css).toContain("interpolate-size: allow-keywords;");
		expect(css).toMatch(/&::details-content \{\s*block-size: 0;/);
		expect(css).toMatch(/&\[open\]::details-content \{\s*block-size: auto;/);
		expect(css).toContain("content-visibility var(--_close-time) allow-discrete");
	});

	it("falls back to a 0fr to 1fr grid row without interpolate-size", () => {
		expect(css).toMatch(
			/@supports not \(interpolate-size: allow-keywords\) \{[\s\S]*grid-template-rows: 0fr;[\s\S]*grid-template-rows: 1fr;/,
		);
	});

	it("glides both ways, turns the chevron on the swap spring and fades content in from a blur", () => {
		expect(css).toContain("--_open-ease: var(--spring-glide);");
		expect(css).toContain("--_close-ease: var(--spring-glide);");
		expect(css).toContain("rotate var(--spring-swap-duration) var(--spring-swap)");
		expect(css).toMatch(/@starting-style \{\s*opacity: 0;\s*filter: blur\(4px\);/);
	});

	it("keeps motion preferences in the rx-motion layer", () => {
		const motion = css.slice(css.indexOf("@layer rx-motion"));
		expect(motion).toContain("@media (prefers-reduced-motion: reduce)");
		expect(motion).toContain('[data-motion="off"]');
		expect(css.slice(0, css.indexOf("@layer rx-motion"))).not.toContain("prefers-reduced-motion");
	});
});
