import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { anchorName, flipOf, popoverAligns, popoverSides } from "../hooks/use-popover";
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "./popover";
import { placement, popoverParts } from "./popover.styles";

const css = readFileSync(new URL("../styles/popover.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

const example = (content: Partial<React.ComponentProps<typeof PopoverContent>> = {}) => (
	<Popover>
		<PopoverTrigger>Open</PopoverTrigger>
		<PopoverContent {...content}>
			<PopoverHeader>
				<PopoverTitle>Dimensions</PopoverTitle>
				<PopoverDescription>Set the size.</PopoverDescription>
			</PopoverHeader>
			<PopoverClose>Done</PopoverClose>
		</PopoverContent>
	</Popover>
);

describe("Popover markup", () => {
	it("makes the trigger a native invoker and the anchor", () => {
		const out = html(example());
		const id = out.match(/<div role="dialog"[^>]*id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		// React writes the camelCase name; HTML attribute names are case-insensitive.
		expect(out).toContain(`popoverTarget="${id}"`);
		expect(out).toMatch(/aria-haspopup="dialog" aria-expanded="false" aria-controls="[^"]+"/);
		expect(out).toMatch(/style="anchor-name:--anchor-[\w-]+"/);
		expect(out).toContain('data-slot="popover-trigger"');
		expect(out).toMatch(/^<button type="button"/);
	});

	it("renders the panel as an auto popover placed on its trigger's anchor", () => {
		const out = html(example());
		expect(out).toContain('popover="auto"');
		expect(out).toContain('class="rx-popover"');
		expect(out).toContain('data-side="bottom" data-align="center"');
		const anchor = out.match(/anchor-name:(--anchor-[\w-]+)/)?.[1];
		expect(out).toContain(`position-anchor:${anchor}`);
		expect(out).toContain('class="rx-surface rx-popover-surface rx-popover-content"');
		expect(out).toContain('tabindex="-1"');
	});

	it("passes side, align and a pixel offset through", () => {
		const out = html(example({ side: "left", align: "end", sideOffset: 12 }));
		expect(out).toContain('data-side="left" data-align="end"');
		expect(out).toContain("--_offset:12px");
	});

	it("puts className on the panel and other props on the popover", () => {
		const out = html(example({ className: "w-96", "aria-label": "Size" }));
		expect(out).toContain("rx-popover-content w-96");
		expect(out).toMatch(/<div role="dialog"[^>]*aria-label="Size"[^>]*popover="auto"/);
	});

	it("closes with a native hide invoker", () => {
		const out = html(example());
		expect(out).toMatch(
			/popoverTarget="[^"]+" popoverTargetAction="hide" data-slot="popover-close"/,
		);
	});

	it("merges into its child with asChild", () => {
		const out = html(
			<Popover>
				<PopoverTrigger asChild>
					<button type="button" className="mine" style={{ color: "red" }}>
						Open
					</button>
				</PopoverTrigger>
				<PopoverContent>Body</PopoverContent>
			</Popover>,
		);
		expect(out).toMatch(/^<button type="button" class="mine"[^>]*popoverTarget=/);
		expect(out).toMatch(/style="anchor-name:--anchor-[\w-]+;color:red"/);
	});

	it("throws outside a Popover", () => {
		expect(() => html(<PopoverTrigger>Open</PopoverTrigger>)).toThrow(/inside <Popover>/);
	});
});

describe("helpers", () => {
	it("makes a dashed-ident anchor name from a React id", () => {
		expect(anchorName("«r1»")).toBe("--anchor-r1");
		expect(anchorName(":r1:")).toBe("--anchor-r1");
		expect(anchorName("_R_abc_")).toBe("--anchor-_R_abc_");
	});

	it("names the placement attributes", () => {
		expect(placement()).toEqual({ "data-side": "bottom", "data-align": "center" });
		expect(placement({ side: "top", align: "end" })).toEqual({
			"data-side": "top",
			"data-align": "end",
		});
		expect(popoverParts.surface).toBe("rx-surface rx-popover-surface");
	});

	const anchor = { top: 100, bottom: 140, left: 100, right: 200 };
	it("reads no flip when the panel sits where it was asked", () => {
		expect(
			flipOf({
				side: "bottom",
				align: "start",
				anchor,
				panel: { top: 148, bottom: 300, left: 100, right: 300 },
			}),
		).toBe("");
		expect(
			flipOf({
				side: "right",
				align: "center",
				anchor,
				panel: { top: 60, bottom: 180, left: 208, right: 400 },
			}),
		).toBe("");
	});

	it("reads a flip across the side and along the alignment", () => {
		// Asked below, landed above.
		expect(
			flipOf({
				side: "bottom",
				align: "center",
				anchor,
				panel: { top: 0, bottom: 92, left: 50, right: 250 },
			}),
		).toBe("block");
		// Asked to line up with the start edge, hangs past the start instead.
		expect(
			flipOf({
				side: "bottom",
				align: "start",
				anchor,
				panel: { top: 148, bottom: 300, left: 0, right: 200 },
			}),
		).toBe("inline");
		// Asked on the right, landed on the left, and its end-aligned bottom moved.
		expect(
			flipOf({
				side: "right",
				align: "end",
				anchor,
				panel: { top: 100, bottom: 260, left: 0, right: 92 },
			}),
		).toBe("block inline");
	});
});

describe("popover.css", () => {
	it("places every side and alignment with position-area and flips with try fallbacks", () => {
		for (const side of popoverSides.filter((s) => s !== "bottom"))
			expect(css).toContain(`.rx-popover[data-side="${side}"] {`);
		for (const align of popoverAligns.filter((a) => a !== "center"))
			expect(css).toContain(`[data-align="${align}"]`);
		expect(css).toContain("position-area: bottom span-right");
		expect(css).toContain("position-try-fallbacks:");
		expect(css).toContain("flip-block flip-inline");
		expect(css).toContain("@supports (position-area: bottom)");
	});

	it("unfolds from the anchor side, mirrored by data-flip", () => {
		expect(css).toContain("transform-origin: var(--_ox) var(--_oy)");
		expect(css).toContain('.rx-popover[data-flip~="block"] > .rx-popover-surface');
		expect(css).toContain('.rx-popover[data-flip~="inline"] > .rx-popover-surface');
	});

	it("enters from @starting-style on the unfold spring and leaves with display and overlay", () => {
		expect(css).toContain("@starting-style");
		expect(css).toContain("var(--spring-unfold)");
		expect(css).toContain("@keyframes rx-popover-reveal");
		expect(css).toContain("display var(--_exit) allow-discrete");
		expect(css).toContain("overlay var(--_exit) allow-discrete");
	});

	it("honours both motion switches in the rx-motion layer and casts no shadow", () => {
		expect(css).toMatch(
			/@layer rx-motion \{[\s\S]*prefers-reduced-motion: reduce[\s\S]*data-motion="off"/,
		);
		expect(css).not.toMatch(/box-shadow|--shadow-/);
		expect(css).not.toContain("!important");
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});
