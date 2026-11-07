import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipContent, TooltipKbd, TooltipProvider, TooltipTrigger } from "./tooltip";
import {
	anchorName,
	arrowOffset,
	fallbackPosition,
	placedSide,
	tooltipClass,
	tooltipParts,
} from "./tooltip.styles";

const css = readFileSync(new URL("../styles/tooltip.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("tooltipClass", () => {
	it("has a rule in tooltip.css for the tooltip and every part", () => {
		for (const name of [tooltipClass(), ...Object.values(tooltipParts)])
			expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});
});

describe("tooltip.css", () => {
	it("is placed by anchor positioning and flips with position-try-fallbacks", () => {
		expect(css).toContain("position-area: top;");
		expect(css).toContain("position-area: bottom span-right;");
		expect(css).toContain("position-try-fallbacks: flip-block");
		expect(css).toContain("position-visibility: anchors-visible");
		expect(css).toContain("@supports not (position-area: top)");
	});

	it("enters from @starting-style on the unfold spring and leaves with display and overlay", () => {
		expect(css).toContain("@starting-style");
		expect(css).toContain("var(--spring-unfold)");
		expect(css).toContain("display var(--_exit) allow-discrete");
		expect(css).toContain("overlay var(--_exit) allow-discrete");
		expect(css).toContain("&:popover-open");
	});

	it("grows from the side it was placed on", () => {
		for (const side of ["bottom", "left", "right"])
			expect(css).toContain(`&[data-placed="${side}"] {\n\t\t\ttransform-origin`);
	});

	it("keeps motion preferences in the rx-motion layer and casts no shadow", () => {
		const motion = css.slice(css.indexOf("@layer rx-motion"));
		expect(motion).toContain("@media (prefers-reduced-motion: reduce)");
		expect(motion).toContain('[data-motion="off"]');
		expect(css.slice(0, css.indexOf("@layer rx-motion"))).not.toContain("prefers-reduced-motion");
		// Only hairline rings: every box-shadow is a 1px ring in the ring color, never a blur.
		for (const [, value] of css.matchAll(/box-shadow:\s*([^;]+);/g)) {
			expect(value).toContain("var(--_tip-ring)");
			expect(value).toMatch(/^(-?[01]px |0 ){3}0? ?(1px )?var/);
		}
	});

	it("draws the key with generated content that has empty alternative text", () => {
		expect(css).toContain('content: attr(data-key) / "";');
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
		expect(css).not.toContain("!important");
	});
});

describe("anchorName", () => {
	it("turns any React id into a dashed ident", () => {
		expect(anchorName("«r1»")).toBe("--_tooltip-r1");
		expect(anchorName(":r2:")).toBe("--_tooltip-r2");
		expect(anchorName("_r_3_")).toBe("--_tooltip-_r_3_");
	});
});

const trigger = { left: 100, top: 100, right: 140, bottom: 120 };

describe("placedSide", () => {
	it("reads a flip from the two boxes", () => {
		const above = { left: 80, top: 70, right: 160, bottom: 94 };
		const below = { left: 80, top: 126, right: 160, bottom: 150 };
		expect(placedSide(trigger, above, "top")).toBe("top");
		expect(placedSide(trigger, below, "top")).toBe("bottom");
		expect(placedSide(trigger, above, "bottom")).toBe("top");
		const left = { left: 20, top: 98, right: 94, bottom: 122 };
		expect(placedSide(trigger, left, "right")).toBe("left");
		expect(placedSide(trigger, { ...left, left: 146, right: 220 }, "left")).toBe("right");
	});
});

describe("arrowOffset", () => {
	it("sits under the trigger's center", () => {
		// Center 120, tooltip from 80: 40 in, less half the 10px arrow.
		expect(arrowOffset(trigger, { left: 80, top: 70, right: 160, bottom: 94 }, "top")).toBe(35);
	});

	it("stays clear of the corners when the tooltip is shifted", () => {
		expect(arrowOffset(trigger, { left: 115, top: 70, right: 300, bottom: 94 }, "top")).toBe(8);
		expect(arrowOffset(trigger, { left: 0, top: 70, right: 100, bottom: 94 }, "bottom")).toBe(82);
	});

	it("runs down the edge for left and right", () => {
		expect(arrowOffset(trigger, { left: 150, top: 90, right: 250, bottom: 130 }, "right")).toBe(15);
	});
});

describe("fallbackPosition", () => {
	const viewport = { width: 400, height: 300 };
	const size = { width: 80, height: 24 };

	it("places it on the preferred side with the offset", () => {
		expect(
			fallbackPosition(trigger, size, viewport, { side: "top", align: "center", offset: 6 }),
		).toEqual({ x: 80, y: 70, side: "top" });
		expect(
			fallbackPosition(trigger, size, viewport, { side: "right", align: "start", offset: 6 }),
		).toEqual({ x: 146, y: 100, side: "right" });
	});

	it("flips when the preferred side has no room", () => {
		const high = { left: 100, top: 10, right: 140, bottom: 30 };
		expect(
			fallbackPosition(high, size, viewport, { side: "top", align: "center", offset: 6 }).side,
		).toBe("bottom");
	});

	it("keeps it inside the viewport along the edge", () => {
		const edge = { left: 2, top: 100, right: 22, bottom: 120 };
		expect(fallbackPosition(edge, size, viewport, { side: "top", align: "end", offset: 6 }).x).toBe(
			8,
		);
	});
});

const basic = (props: Partial<React.ComponentProps<typeof Tooltip>> = {}) => (
	<Tooltip {...props}>
		<TooltipTrigger>Save</TooltipTrigger>
		<TooltipContent>Save the draft</TooltipContent>
	</Tooltip>
);

describe("Tooltip", () => {
	it("renders a hint popover with the tooltip role, closed", () => {
		const markup = html(basic());
		expect(markup).toMatch(/<span[^>]*popover="hint"[^>]*role="tooltip"/);
		expect(markup).toContain('data-slot="tooltip-content"');
		expect(markup).toContain('data-state="closed"');
		expect(markup).toContain('data-side="top"');
		expect(markup).toContain('data-align="center"');
		expect(markup).toContain('class="rx-tooltip"');
	});

	it("describes the trigger, anchors the tooltip to it and invokes it before hydration", () => {
		const markup = html(basic());
		const id = markup.match(/role="tooltip"[^>]*id="([^"]+)"|id="([^"]+)"[^>]*role="tooltip"/);
		const contentId = id?.[1] ?? id?.[2];
		expect(contentId).toBeTruthy();
		const button = markup.match(/<button[^>]*>/)?.[0] ?? "";
		expect(button).toContain('type="button"');
		expect(button).toContain(`aria-describedby="${contentId}"`);
		expect(button).toContain(`interestfor="${contentId}"`);
		const anchor = button.match(/anchor-name:(--[\w-]+)/)?.[1];
		expect(anchor).toMatch(/^--_tooltip-/);
		expect(markup).toContain(`position-anchor:${anchor}`);
	});

	it("names the trigger with asLabel and hides the copy from the tree", () => {
		const markup = html(
			<Tooltip asLabel>
				<TooltipTrigger>
					<svg aria-hidden="true" />
				</TooltipTrigger>
				<TooltipContent>Bold</TooltipContent>
			</Tooltip>,
		);
		expect(markup).toMatch(/<button[^>]*aria-labelledby="[^"]+-tooltip"/);
		expect(markup).not.toContain("aria-describedby");
		expect(markup).toMatch(/role="tooltip" aria-hidden="true"/);
	});

	it("merges into its child with asChild, keeping the child's own description", () => {
		const markup = html(
			<Tooltip>
				<TooltipTrigger asChild>
					<a href="#x" aria-describedby="hint" style={{ color: "red" }}>
						Docs
					</a>
				</TooltipTrigger>
				<TooltipContent>Opens the docs</TooltipContent>
			</Tooltip>,
		);
		expect(markup).toMatch(/^<a href="#x"/);
		expect(markup).not.toContain("<button");
		expect(markup).toMatch(/aria-describedby="hint [^"]+-tooltip"/);
		expect(markup).toMatch(/style="anchor-name:--_tooltip-[\w-]+;color:red"/);
	});

	it("takes the side, the alignment, the offset and an arrow", () => {
		const markup = html(
			<Tooltip>
				<TooltipTrigger>Save</TooltipTrigger>
				<TooltipContent side="right" align="end" sideOffset={10} arrow>
					Save
				</TooltipContent>
			</Tooltip>,
		);
		expect(markup).toContain('data-side="right"');
		expect(markup).toContain('data-align="end"');
		expect(markup).toContain('data-arrow=""');
		expect(markup).toContain("--_offset:10px");
		expect(markup).toContain('<span class="rx-tooltip-arrow" aria-hidden="true"></span>');
	});

	it("draws a shortcut key cap with CSS, so it is never part of the name", () => {
		const markup = html(
			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger aria-keyshortcuts="Meta+B">B</TooltipTrigger>
					<TooltipContent>
						Bold <TooltipKbd>⌘B</TooltipKbd>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		);
		expect(markup).toContain(
			'<kbd data-key="⌘B" data-slot="tooltip-kbd" class="rx-tooltip-kbd"></kbd>',
		);
	});

	it("needs a Tooltip around its parts", () => {
		expect(() => html(<TooltipContent>Lost</TooltipContent>)).toThrow(/inside <Tooltip>/);
	});
});
