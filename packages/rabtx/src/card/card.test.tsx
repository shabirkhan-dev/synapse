import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./card";
import { CardStack } from "./card-stack";
import { cardClass, cardParts, cardSizes } from "./card.styles";
import { ExpandableCard } from "./expandable-card";
import { pointerRatio, tiltAngles } from "./pointer";
import { SpotlightCard } from "./spotlight-card";
import { TiltCard } from "./tilt-card";

const css = readFileSync(new URL("../styles/card.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("cardClass", () => {
	it("is the shared surface plus the card, with a class only for the non-default sizes", () => {
		expect(cardClass()).toBe("rx-surface rx-card");
		expect(cardClass("sm")).toBe("rx-surface rx-card rx-card-sm");
		expect(cardClass("lg")).toBe("rx-surface rx-card rx-card-lg");
	});

	it("has a rule in card.css for every class it can return", () => {
		const names = [
			"rx-card",
			...cardSizes.filter((size) => size !== "default").map((size) => `rx-card-${size}`),
			...Object.values(cardParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});
});

describe("card.css", () => {
	it("animates only with CSS springs and honours both motion switches", () => {
		expect(css).toContain("var(--spring-press)");
		expect(css).toContain("var(--spring-magnetic)");
		expect(css).toContain("var(--spring-panel)");
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toContain('[data-motion="off"]');
	});

	it("grows heights to auto with interpolate-size and opens details with ::details-content", () => {
		expect(css).toContain("interpolate-size: allow-keywords");
		expect(css).toContain("&::details-content");
		expect(css).toContain("content-visibility var(--spring-panel-duration) allow-discrete");
	});

	it("derives interactive and selected states from the target with :has()", () => {
		expect(css).toContain(".rx-card:has(.rx-card-target)");
		expect(css).toContain("&:has(.rx-card-target:focus-visible)");
		expect(css).toMatch(/\.rx-card-target :checked/);
		expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*&:hover/);
	});

	it("lets a narrow header drop its action with a container query", () => {
		expect(css).toContain("container: rx-card-header / inline-size");
		expect(css).toContain("@container rx-card-header (width < 15rem)");
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});

describe("Card", () => {
	it("renders the shadcn parts with their data slots", () => {
		const markup = html(
			<Card>
				<CardHeader>
					<CardTitle>Title</CardTitle>
					<CardDescription>Description</CardDescription>
					<CardAction>Edit</CardAction>
				</CardHeader>
				<CardContent>Body</CardContent>
				<CardFooter>Footer</CardFooter>
			</Card>,
		);
		expect(markup).toBe(
			'<div data-slot="card" data-size="default" class="rx-surface rx-card">' +
				'<div data-slot="card-header" class="rx-card-header">' +
				'<div data-slot="card-title" class="rx-card-title">Title</div>' +
				'<p data-slot="card-description" class="rx-card-description">Description</p>' +
				'<div data-slot="card-action" class="rx-card-action">Edit</div></div>' +
				'<div data-slot="card-content" class="rx-card-content">Body</div>' +
				'<div data-slot="card-footer" class="rx-card-footer">Footer</div></div>',
		);
	});

	it("takes a size, a semantic tag and className", () => {
		const markup = html(
			<Card as="article" size="sm" className="w-72" aria-labelledby="t">
				<CardHeader as="header">
					<CardTitle as="h3" id="t">
						T
					</CardTitle>
				</CardHeader>
				<CardFooter as="footer" />
			</Card>,
		);
		expect(markup).toContain(
			'<article aria-labelledby="t" data-slot="card" data-size="sm" class="rx-surface rx-card rx-card-sm w-72">',
		);
		expect(markup).toContain('<header data-slot="card-header"');
		expect(markup).toContain('<h3 id="t" data-slot="card-title"');
		expect(markup).toContain('<footer data-slot="card-footer"');
	});

	it("adds no role or tab stop of its own", () => {
		const markup = html(<Card>Plain</Card>);
		expect(markup).not.toContain("tabindex");
		expect(markup).not.toContain("role=");
	});
});

describe("TiltCard and SpotlightCard", () => {
	it("are Cards with their look class and no extra focus stop", () => {
		const tilt = html(<TiltCard>A</TiltCard>);
		expect(tilt).toContain('class="rx-surface rx-card rx-card-tilt"');
		expect(tilt).toContain("data-glare");
		expect(html(<TiltCard glare={false}>A</TiltCard>)).not.toContain("data-glare");
		const spot = html(<SpotlightCard size="lg">A</SpotlightCard>);
		expect(spot).toContain('class="rx-surface rx-card rx-card-lg rx-card-spotlight"');
		expect(tilt + spot).not.toContain("tabindex");
	});

	it("measures the pointer as a 0 to 1 ratio, clamped to the card", () => {
		const rect = { left: 100, top: 50, width: 200, height: 100 };
		expect(pointerRatio(rect, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
		expect(pointerRatio(rect, 100, 150)).toEqual({ x: 0, y: 1 });
		expect(pointerRatio(rect, 999, -5)).toEqual({ x: 1, y: 0 });
		expect(pointerRatio({ ...rect, width: 0, height: 0 }, 0, 0)).toEqual({ x: 0.5, y: 0.5 });
	});

	it("tilts so the side under the pointer dips, by half of max at an edge", () => {
		expect(tiltAngles({ x: 0.5, y: 0.5 }, 10)).toEqual({ x: 0, y: 0 });
		expect(tiltAngles({ x: 1, y: 0.5 }, 10)).toEqual({ x: 0, y: 5 });
		expect(tiltAngles({ x: 0, y: 0 }, 12)).toEqual({ x: 6, y: -6 });
	});
});

describe("ExpandableCard", () => {
	it("is a details card whose summary holds the title, description and chevron", () => {
		const markup = html(
			<ExpandableCard title="Billing" description="Plan and invoices" name="settings">
				Body
			</ExpandableCard>,
		);
		expect(markup).toMatch(/^<details name="settings" data-slot="card" data-size="default"/);
		expect(markup).toContain('class="rx-surface rx-card rx-card-expandable"');
		expect(markup).toContain(
			'<summary class="rx-card-summary"><span class="rx-card-header"><span class="rx-card-title">Billing</span><span class="rx-card-description">Plan and invoices</span></span><span class="rx-card-chevron" aria-hidden="true"></span></summary>',
		);
		expect(markup).toContain('<div class="rx-card-content">Body</div></details>');
		expect(markup).not.toContain(" open");
	});

	it("starts open from defaultOpen or open", () => {
		expect(html(<ExpandableCard title="A" defaultOpen />)).toContain(" open");
		expect(html(<ExpandableCard title="A" open />)).toContain(" open");
	});
});

const stack = (props: Partial<React.ComponentProps<typeof CardStack>> = {}) =>
	html(
		<CardStack noun="notifications" {...props}>
			<Card key="a">A</Card>
			<Card key="b">B</Card>
			<Card key="c">C</Card>
			<Card key="d">D</Card>
		</CardStack>,
	);

describe("CardStack", () => {
	it("collapsed, keeps the first card live, the rest inert, and names the toggle", () => {
		const markup = stack();
		expect(markup).toContain('style="--_count:4;--_peeks:2"');
		expect(markup.match(/inert=""/g)).toHaveLength(3);
		expect(markup).toContain('<li class="rx-card-stack-item" style="--_i:0">');
		expect(markup.match(/data-hidden/g)).toHaveLength(1);
		expect(markup).toMatch(/aria-expanded="false" aria-controls="[^"]+">Show all 4 notifications/);
		expect(markup).not.toContain("data-expanded");
	});

	it("open, every card is live and the toggle offers to collapse", () => {
		const markup = stack({ defaultExpanded: true });
		expect(markup).toContain("data-expanded");
		expect(markup).not.toContain("inert");
		expect(markup).toContain('aria-expanded="true"');
		expect(markup).toContain(">Show less<");
	});

	it("has no toggle for a single card", () => {
		expect(
			html(
				<CardStack>
					<Card>Only</Card>
				</CardStack>,
			),
		).not.toContain("<button");
	});
});
