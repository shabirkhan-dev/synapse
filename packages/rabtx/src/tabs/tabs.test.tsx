import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SPRINGS } from "../motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { tabsListClass, tabsParts, tabsSizes, tabsVariants } from "./tabs.styles";

const css = readFileSync(new URL("../styles/tabs.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

const example = (props: Partial<React.ComponentProps<typeof Tabs>> = {}, list = {}) => (
	<Tabs defaultValue="a" {...props}>
		<TabsList aria-label="Things" {...list}>
			<TabsTrigger value="a">Alpha</TabsTrigger>
			<TabsTrigger value="b">Beta</TabsTrigger>
			<TabsTrigger value="c" disabled>
				Gamma
			</TabsTrigger>
		</TabsList>
		<TabsContent value="a">One</TabsContent>
		<TabsContent value="b">Two</TabsContent>
	</Tabs>
);

describe("tabsListClass", () => {
	it("defaults to segmented and medium, and names every variant and size", () => {
		expect(tabsListClass()).toBe("rx-tabs-list rx-tabs-segmented rx-tabs-md");
		for (const variant of tabsVariants) {
			for (const size of tabsSizes) {
				expect(tabsListClass(variant, size)).toBe(
					`rx-tabs-list rx-tabs-${variant} rx-tabs-${size}`,
				);
			}
		}
	});

	it("has a rule in tabs.css for every class it can return", () => {
		const names = [
			...tabsVariants.map((variant) => `rx-tabs-${variant}`),
			...tabsSizes.filter((size) => size !== "md").map((size) => `rx-tabs-${size}`),
			"rx-tabs-list",
			...Object.values(tabsParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});
});

describe("tabs.css", () => {
	it("anchors the indicator to the selected tab, scoped to its own list", () => {
		expect(css).toMatch(/\.rx-tabs-list \{\s*anchor-scope: --_tab;/);
		expect(css).toMatch(/\.rx-tabs-trigger\[aria-selected="true"\] \{\s*anchor-name: --_tab;/);
		expect(css).toContain("position-anchor: --_tab;");
		for (const side of ["top", "right", "bottom", "left"]) {
			expect(css).toContain(`${side}: anchor(${side});`);
		}
	});

	it("glides the indicator on the tabs spring, in CSS only", () => {
		expect(SPRINGS.tabs).toEqual({ stiffness: 245, damping: 36, mass: 1.2 });
		for (const side of ["top", "right", "bottom", "left"]) {
			expect(css).toContain(`${side} var(--spring-tabs-duration) var(--spring-tabs)`);
		}
	});

	it("falls back to a highlight on the tab itself without anchor positioning", () => {
		expect(css).toMatch(
			/@supports not \(anchor-scope: all\) \{\s*\.rx-tabs-trigger\[aria-selected="true"\]::before \{\s*opacity: 1;/,
		);
		expect(css).toMatch(/\.rx-tabs-indicator \{\s*display: none;/);
	});

	it("opens an expandable tab's label with the grid trick on the swap spring", () => {
		expect(css).toContain("grid-template-columns: auto 0fr;");
		expect(css).toContain("grid-template-columns: auto 1fr;");
		expect(css).toContain("grid-template-columns var(--spring-swap-duration) var(--spring-swap)");
	});

	it("fades a panel in with @starting-style", () => {
		expect(css).toMatch(/@starting-style \{\s*opacity: 0;\s*filter: blur\(4px\);/);
	});

	it("honours reduced motion and the motion-off mode", () => {
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toMatch(/\[data-motion="off"\] :is\(\.rx-tabs-indicator, /);
	});

	it("drops the raised edges in Flat", () => {
		expect(css).toMatch(
			/\[data-depth="flat"\] \.rx-tabs-segmented \{[^}]*--_ind-ring: transparent;/,
		);
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});

describe("Tabs", () => {
	it("renders a named tablist of tab buttons and their panels", () => {
		const markup = html(example());
		expect(markup).toContain('<div data-orientation="horizontal" class="rx-tabs">');
		expect(markup).toContain(
			'role="tablist" aria-orientation="horizontal" data-orientation="horizontal" class="rx-tabs-list rx-tabs-segmented rx-tabs-md"',
		);
		expect(markup.match(/role="tab"/g)).toHaveLength(3);
		expect(markup.match(/role="tabpanel"/g)).toHaveLength(2);
		expect(markup).toContain('<span class="rx-tabs-indicator" aria-hidden="true"></span></div>');
	});

	it("wires each tab to its panel both ways", () => {
		const markup = html(example());
		const tab = markup.match(/<button id="([^"]+)" aria-controls="([^"]+)"[^>]*>/);
		expect(tab).toBeTruthy();
		const [, tabId, panelId] = tab ?? [];
		expect(markup).toContain(`id="${panelId}" aria-labelledby="${tabId}"`);
	});

	it("marks the selected tab and keeps it the only tab stop", () => {
		const markup = html(example());
		expect(markup).toMatch(/aria-selected="true" data-state="active" tabindex="0"[^>]*>.*?Alpha/);
		expect(markup).toMatch(
			/aria-selected="false" data-state="inactive" tabindex="-1"[^>]*>.*?Beta/,
		);
		expect(markup.match(/tabindex="0" class="rx-tabs-trigger"/g)).toHaveLength(1);
	});

	it("hides the panels of the tabs that are not selected, and lets the open one take focus", () => {
		const markup = html(example({ defaultValue: "b" }));
		expect(markup).toMatch(/tabindex="0" role="tabpanel" hidden="" data-state="inactive"[^>]*>One/);
		expect(markup).toMatch(/tabindex="0" role="tabpanel" data-state="active"[^>]*>Two/);
	});

	it("follows a controlled value", () => {
		expect(html(example({ value: "b", onValueChange: () => {} }))).toMatch(
			/aria-selected="true"[^>]*>.*?Beta/,
		);
	});

	it("renders a disabled tab as a disabled button", () => {
		expect(html(example())).toMatch(/disabled=""[^>]*>.*?Gamma/);
	});

	it("takes the orientation onto the root and the list", () => {
		const markup = html(example({ orientation: "vertical" }));
		expect(markup).toContain('data-orientation="vertical" class="rx-tabs"');
		expect(markup).toContain('aria-orientation="vertical"');
	});

	it("takes a variant, a size and a className", () => {
		const markup = html(example({}, { variant: "pill", size: "lg", className: "w-full" }));
		expect(markup).toContain('class="rx-tabs-list rx-tabs-pill rx-tabs-lg w-full"');
	});

	it("draws an expandable list's highlight on the tabs, with no indicator", () => {
		const markup = html(
			<Tabs defaultValue="a">
				<TabsList variant="expandable" aria-label="x">
					<TabsTrigger value="a" icon={<svg />}>
						Home
					</TabsTrigger>
				</TabsList>
			</Tabs>,
		);
		expect(markup).not.toContain("rx-tabs-indicator");
		expect(markup).toContain(
			'<span class="rx-tabs-icon" aria-hidden="true"><svg></svg></span><span class="rx-tabs-label"><span class="rx-tabs-text">Home</span></span>',
		);
	});

	it("gives every tab value a usable id", () => {
		const markup = html(
			<Tabs defaultValue="a b/c">
				<TabsList aria-label="x">
					<TabsTrigger value="a b/c">Odd</TabsTrigger>
				</TabsList>
			</Tabs>,
		);
		expect(markup).toMatch(/id="[^"]+-tab-a_b_c"/);
	});

	it("needs a Tabs around its parts", () => {
		expect(() => html(<TabsTrigger value="a">A</TabsTrigger>)).toThrow(/inside <Tabs>/);
	});
});
