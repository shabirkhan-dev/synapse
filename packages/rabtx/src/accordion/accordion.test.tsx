import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SPRINGS, solveSpring } from "../motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";
import { accordionClass, accordionParts, accordionVariants } from "./accordion.styles";

const css = readFileSync(new URL("../styles/accordion.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

const items = (
	<>
		<AccordionItem value="a">
			<AccordionTrigger>Alpha</AccordionTrigger>
			<AccordionContent>One</AccordionContent>
		</AccordionItem>
		<AccordionItem value="b">
			<AccordionTrigger icon={<svg />}>Beta</AccordionTrigger>
			<AccordionContent>Two</AccordionContent>
		</AccordionItem>
		<AccordionItem value="c" disabled>
			<AccordionTrigger>Gamma</AccordionTrigger>
			<AccordionContent>Three</AccordionContent>
		</AccordionItem>
	</>
);

const details = (markup: string) => markup.match(/<details[^>]*>/g) ?? [];
const openTags = (markup: string) => details(markup).filter((tag) => tag.includes('open=""'));

describe("accordionClass", () => {
	it("defaults to separated and names every variant", () => {
		expect(accordionClass()).toBe("rx-accordion rx-accordion-separated");
		for (const variant of accordionVariants)
			expect(css, variant).toMatch(new RegExp(`\\.rx-accordion-${variant}[\\s,{.:>\\[)]`));
	});

	it("has a rule in accordion.css for every part", () => {
		for (const name of Object.values(accordionParts))
			expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});
});

describe("Accordion", () => {
	it("renders every item as a Collapsible details, in one name group when single", () => {
		const markup = html(<Accordion defaultValue="b">{items}</Accordion>);
		expect(markup).toMatch(
			/^<div data-slot="accordion" data-orientation="vertical" class="rx-accordion rx-accordion-separated">/,
		);
		const tags = details(markup);
		expect(tags).toHaveLength(3);
		const names = tags.map((tag) => tag.match(/name="([^"]+)"/)?.[1]);
		expect(names[0]).toBeTruthy();
		expect(new Set(names).size).toBe(1);
		for (const tag of tags) expect(tag).toContain('class="rx-collapsible rx-accordion-item"');
		expect(tags[1]).toContain('open=""');
		expect(tags[0]).not.toContain('open=""');
	});

	it("leaves multiple accordions ungrouped and opens every default value", () => {
		const markup = html(
			<Accordion type="multiple" defaultValue={["a", "b"]}>
				{items}
			</Accordion>,
		);
		const tags = details(markup);
		for (const tag of tags) expect(tag).not.toContain("name=");
		expect(tags.filter((tag) => tag.includes('open=""'))).toHaveLength(2);
	});

	it("follows a controlled value, and '' opens nothing", () => {
		expect(
			openTags(
				html(
					<Accordion value="a" onValueChange={() => {}}>
						{items}
					</Accordion>,
				),
			),
		).toHaveLength(1);
		expect(
			openTags(
				html(
					<Accordion value="" onValueChange={() => {}}>
						{items}
					</Accordion>,
				),
			),
		).toHaveLength(0);
	});

	it("names each panel region by its trigger", () => {
		const markup = html(<Accordion defaultValue="a">{items}</Accordion>);
		const trigger = markup.match(/<summary id="([^"]+)"/)?.[1];
		expect(trigger).toBeTruthy();
		expect(markup).toMatch(new RegExp(`role="region" aria-labelledby="${trigger}"`));
		expect(markup).toContain('data-slot="accordion-trigger"');
		expect(markup).toContain('data-slot="accordion-content"');
	});

	it("marks the open item of a non-collapsible single accordion as unable to close", () => {
		const locked = html(<Accordion defaultValue="a">{items}</Accordion>);
		expect(locked).toMatch(
			/<summary[^>]*aria-disabled="true"[^>]*><span class="rx-accordion-title">Alpha/,
		);
		const free = html(
			<Accordion collapsible defaultValue="a">
				{items}
			</Accordion>,
		);
		expect(free.match(/aria-disabled="true"/g)).toHaveLength(1); // only the disabled item
	});

	it("draws an icon before the title and disables an item", () => {
		const markup = html(<Accordion>{items}</Accordion>);
		expect(markup).toContain(
			'<span class="rx-accordion-icon" aria-hidden="true"><svg></svg></span><span class="rx-accordion-title">Beta</span>',
		);
		expect(markup).toMatch(/<summary[^>]*tabindex="-1"[^>]*data-disabled=""[^>]*>.*?Gamma/);
	});

	it("takes a variant and a className", () => {
		expect(
			html(
				<Accordion variant="flush" className="w-80">
					{items}
				</Accordion>,
			),
		).toContain('class="rx-accordion rx-accordion-flush w-80"');
	});

	it("needs an Accordion around its items", () => {
		expect(() => html(<AccordionItem value="a" />)).toThrow(/inside <Accordion>/);
	});
});

describe("accordion.css", () => {
	it("opens on the bouncy expand spring, a few percent past its height", () => {
		expect(SPRINGS.expand).toEqual({ stiffness: 117, damping: 14.7, mass: 1 });
		const solved = solveSpring(SPRINGS.expand);
		expect(solved.overshootPercent).toBeGreaterThan(4);
		expect(solved.overshootPercent).toBeLessThan(7);
		expect(css).toContain("--_open-ease: var(--spring-expand);");
	});

	it("lifts the open item out of a separated stack with sibling selectors", () => {
		expect(css).toMatch(/&\[open\] \+ \.rx-accordion-item,\s*& \+ \.rx-accordion-item\[open\] \{/);
		expect(css).toMatch(/&:has\(\+ \.rx-accordion-item\[open\]\) \{\s*--_re: var\(--_r\);/);
		expect(css).toContain("margin-block-start var(--_time) var(--_ease)");
		expect(css).toContain("border-radius var(--_time) var(--_ease)");
	});

	it("beats collapsible.css by specificity, not file order", () => {
		expect(css).toContain(".rx-accordion > .rx-accordion-item {");
		expect(css).toContain(".rx-accordion-item > .rx-accordion-trigger {");
	});

	it("drops the raised edges in Flat and keeps motion preferences in rx-motion", () => {
		expect(css).toMatch(/\[data-depth="flat"\][^{]*\{\s*--_edge-a: var\(--border\);/);
		const motion = css.slice(css.indexOf("@layer rx-motion"));
		expect(motion).toContain("@media (prefers-reduced-motion: reduce)");
		expect(motion).toContain('[data-motion="off"] .rx-accordion-item');
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});
