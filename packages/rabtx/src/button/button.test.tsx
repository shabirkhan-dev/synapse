import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, ButtonLink } from "./button";
import { buttonClass, buttonParts, buttonSizes, buttonVariants } from "./button.styles";
import { exitMs, splitLetters } from "./stateful-label";
import { magneticOffset } from "./magnetic";
import { MagneticButton } from "./magnetic-button";
import { MetallicButton } from "./metallic-button";
import { StatefulButton } from "./stateful-button";
import { ripplePlacement } from "./use-button";

const css = readFileSync(new URL("../styles/button.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("buttonClass", () => {
	it("defaults to a medium primary", () => {
		expect(buttonClass()).toBe("rx-btn rx-btn-primary rx-btn-md");
	});

	it("names every variant and size", () => {
		for (const variant of buttonVariants) {
			for (const size of buttonSizes) {
				expect(buttonClass({ variant, size })).toBe(`rx-btn rx-btn-${variant} rx-btn-${size}`);
			}
		}
	});

	it("swaps the tone for the metallic look and tags the magnetic one", () => {
		expect(buttonClass({ variant: "outline", look: "metallic" })).toBe(
			"rx-btn rx-btn-metal rx-btn-md",
		);
		expect(buttonClass({ look: "magnetic" })).toContain(" rx-btn-magnet");
	});

	it("has a rule in button.css for every class it can return", () => {
		const names = [
			...buttonVariants.map((variant) => `rx-btn-${variant}`),
			...buttonSizes.map((size) => `rx-btn-${size}`),
			"rx-btn-metal",
			...Object.values(buttonParts).filter((name) => name !== "rx-btn-content"),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[]`));
	});
});

describe("button.css", () => {
	it("animates only with CSS springs and keyframes, and honours both motion switches", () => {
		expect(css).toContain("var(--spring-press)");
		expect(css).toContain("var(--spring-label)");
		expect(css).toContain("var(--spring-magnetic)");
		expect(css).toContain("@keyframes rx-btn-ripple");
		expect(css).toContain("@keyframes rx-btn-roll-in");
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toContain('[data-motion="off"]');
	});

	it("grows on hover only for a fine pointer", () => {
		expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*&:hover/);
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});

describe("Button", () => {
	it("renders a native button that does not submit by default", () => {
		const markup = html(<Button>Save</Button>);
		expect(markup).toBe(
			'<button type="button" class="rx-btn rx-btn-primary rx-btn-md">Save</button>',
		);
	});

	it("passes variant, size, className and a custom press scale through", () => {
		const markup = html(
			<Button variant="ghost" size="lg" pressScale={0.97} className="w-full" type="submit">
				Go
			</Button>,
		);
		expect(markup).toContain('type="submit"');
		expect(markup).toContain('class="rx-btn rx-btn-ghost rx-btn-lg w-full"');
		expect(markup).toContain('style="--_btn-press:0.97"');
	});

	it("needs an accessible name when it is icon only", () => {
		const markup = html(
			<Button size="icon" aria-label="Settings">
				<svg />
			</Button>,
		);
		expect(markup).toContain('aria-label="Settings"');
		expect(markup).toContain("rx-btn-icon");
		// @ts-expect-error an icon button without aria-label does not type-check
		html(<Button size="icon">x</Button>);
	});

	it("adds an empty, hidden ripple layer only when asked", () => {
		expect(html(<Button>A</Button>)).not.toContain(buttonParts.ripples);
		expect(html(<Button ripple>A</Button>)).toContain(
			`<span class="${buttonParts.ripples}" aria-hidden="true"></span>A`,
		);
	});

	it("keeps a disabled button native", () => {
		expect(html(<Button disabled>A</Button>)).toContain("disabled");
	});
});

describe("ButtonLink", () => {
	it("is an anchor with the same classes", () => {
		const markup = html(
			<ButtonLink href="/docs" variant="outline">
				Docs
			</ButtonLink>,
		);
		expect(markup).toBe('<a href="/docs" class="rx-btn rx-btn-outline rx-btn-md">Docs</a>');
	});
});

describe("StatefulButton", () => {
	it("rolls its label as letters, with the whole label for screen readers", () => {
		const markup = html(<StatefulButton>Save</StatefulButton>);
		expect(markup).toContain('data-state="idle"');
		expect(markup).toContain('aria-live="polite"');
		expect(markup).toContain('<span class="rx-btn-sr">Save</span>');
		expect(markup.match(/class="rx-btn-letter"/g)).toHaveLength(4);
		// The first render shows the label as it is; only later swaps roll in.
		expect(markup).not.toContain("data-enter");
	});

	it("shows only the slot for the current state", () => {
		const loading = html(<StatefulButton state="loading">Save</StatefulButton>);
		expect(loading).toContain('aria-busy="true"');
		expect(loading).toMatch(/data-shown=""[^>]*><span class="rx-btn-glyph" data-glyph="spinner"/);
		expect(loading.match(/data-shown/g)).toHaveLength(1);
		expect(loading).toContain(">Loading</span>");

		const done = html(<StatefulButton state="success">Save</StatefulButton>);
		expect(done).not.toContain("aria-busy");
		expect(done).toMatch(/data-shown=""[^>]*><span class="rx-btn-glyph" data-glyph="check"/);
		expect(done).toContain(">Done</span>");

		const failed = html(
			<StatefulButton state="error" errorText="Retry">
				Save
			</StatefulButton>,
		);
		expect(failed).toMatch(/data-shown=""[^>]*><span class="rx-btn-glyph" data-glyph="cross"/);
		expect(failed).toContain(">Retry</span>");
	});

	it("shows the idle icon after the label, and folds it for other states", () => {
		const idle = html(<StatefulButton icon={<svg />}>Send</StatefulButton>);
		expect(idle).toMatch(
			/rx-btn-text.*<span class="rx-btn-slot" data-shown="" aria-hidden="true"><svg>/,
		);
		const busy = html(
			<StatefulButton state="loading" icon={<svg />}>
				Send
			</StatefulButton>,
		);
		expect(busy).toMatch(/rx-btn-text.*<span class="rx-btn-slot" aria-hidden="true"><svg>/);
	});
});

describe("MagneticButton and MetallicButton", () => {
	it("renders the magnetic button as a plain Button with the marker class", () => {
		expect(html(<MagneticButton>Hover</MagneticButton>)).toBe(
			'<button type="button" class="rx-btn rx-btn-primary rx-btn-md rx-btn-magnet">Hover</button>',
		);
	});

	it("layers the chrome under the label, and can pause it", () => {
		const markup = html(<MetallicButton paused>Chrome</MetallicButton>);
		expect(markup).toContain("rx-btn-metal");
		expect(markup).toContain('data-paused=""');
		for (const part of ["metalRim", "metalSheen", "metalFace", "metalBevel"] as const) {
			expect(markup).toContain(`<span class="${buttonParts[part]}" aria-hidden="true"></span>`);
		}
		expect(markup.endsWith("Chrome</button>")).toBe(true);
	});
});

describe("motion math", () => {
	const rect = { left: 100, top: 50, width: 120, height: 40 };

	it("starts a ripple at the press and sizes it to cover the button from any corner", () => {
		expect(ripplePlacement(rect, 110, 60)).toEqual({ x: 10, y: 10, d: 240 });
	});

	it("leans toward the pointer by the strength", () => {
		expect(magneticOffset(rect, 160, 70, 0.25)).toEqual({ x: 0, y: 0 });
		expect(magneticOffset(rect, 200, 90, 0.25)).toEqual({ x: 10, y: 5 });
		expect(magneticOffset(rect, 200, 90, 0)).toEqual({ x: 0, y: 0 });
	});

	it("splits labels by code point and times the exit by the last letter", () => {
		expect(splitLetters("Save 👍")).toEqual(["S", "a", "v", "e", " ", "👍"]);
		expect(exitMs(1)).toBe(160);
		expect(exitMs(5)).toBe(210);
	});
});
