import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog";
import {
	dialogClass,
	dialogParts,
	dialogSides,
	dialogSizes,
	morphName,
	onBackdrop,
} from "./dialog.styles";

const css = readFileSync(new URL("../styles/dialog.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("dialogClass", () => {
	it("is the shared surface, the dialog and a size, plus a side for sheets", () => {
		expect(dialogClass()).toBe("rx-surface rx-dialog rx-dialog-md");
		expect(dialogClass({ size: "sm" })).toBe("rx-surface rx-dialog rx-dialog-sm");
		expect(dialogClass({ size: "lg", side: "right" })).toBe(
			"rx-surface rx-dialog rx-dialog-lg rx-dialog-right",
		);
		expect(dialogClass({ side: "bottom" })).toBe(
			"rx-surface rx-dialog rx-dialog-md rx-dialog-bottom",
		);
	});

	it("has a rule in dialog.css for every class it can return", () => {
		const names = [
			"rx-dialog",
			...dialogSizes.map((size) => `rx-dialog-${size}`),
			...dialogSides.filter((side) => side !== "center").map((side) => `rx-dialog-${side}`),
			...Object.values(dialogParts),
		];
		for (const name of names) expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});
});

describe("dialog.css", () => {
	it("enters from @starting-style on the panel spring and leaves with display and overlay", () => {
		expect(css).toContain("@starting-style");
		expect(css).toContain("var(--spring-panel)");
		expect(css).toContain("display var(--_exit) allow-discrete");
		expect(css).toContain("overlay var(--_exit) allow-discrete");
	});

	it("styles and animates the native backdrop and locks the page scroll in CSS", () => {
		expect(css).toContain("&::backdrop");
		expect(css).toContain("&[open]::backdrop");
		expect(css).toContain(":root:has(.rx-dialog:modal)");
	});

	it("morphs with view transitions on the panel spring", () => {
		expect(css).toContain("view-transition-class: rx-morph");
		expect(css).toContain("::view-transition-group(*.rx-morph)");
		expect(css).toContain(".rx-dialog[data-morphing]");
	});

	it("honours both motion switches and casts no shadow", () => {
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toContain('[data-motion="off"]');
		expect(css).not.toMatch(/box-shadow|--shadow-/);
	});

	it("sits in the components layer so className utilities win", () => {
		expect(css).toMatch(/^@layer components \{/m);
	});
});

describe("helpers", () => {
	it("turns a React id into a view-transition-name", () => {
		expect(morphName("«r1»")).toBe("rx-dialog-r1");
		expect(morphName(":r2:")).toBe("rx-dialog-r2");
	});

	it("knows a backdrop press from a press on the panel", () => {
		const rect = { left: 10, top: 10, right: 110, bottom: 60 };
		expect(onBackdrop(rect, 5, 30)).toBe(true);
		expect(onBackdrop(rect, 60, 70)).toBe(true);
		expect(onBackdrop(rect, 60, 30)).toBe(false);
	});
});

const basic = (props: Partial<React.ComponentProps<typeof Dialog>> = {}) => (
	<Dialog {...props}>
		<DialogTrigger>Open</DialogTrigger>
		<DialogContent size="sm">
			<DialogHeader>
				<DialogTitle>Rename file</DialogTitle>
				<DialogDescription>Pick a new name.</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<DialogClose>Cancel</DialogClose>
			</DialogFooter>
		</DialogContent>
	</Dialog>
);

describe("Dialog", () => {
	it("renders a closed native dialog with light dismiss and a named close button", () => {
		const markup = html(basic());
		expect(markup).toMatch(/<dialog [^>]*closedby="any"/);
		expect(markup).not.toMatch(/<dialog [^>]*\sopen/);
		expect(markup).toContain('data-slot="dialog-content"');
		expect(markup).toContain('data-size="sm"');
		expect(markup).toContain('data-side="center"');
		expect(markup).toMatch(/<button[^>]*class="rx-dialog-close"[^>]*aria-label="Close"/);
	});

	it("wires the trigger to the panel and invokes it before hydration", () => {
		const markup = html(basic());
		const id = markup.match(/<dialog [^>]*id="([^"]+)"/)?.[1];
		expect(id).toBeTruthy();
		const trigger = markup.match(/<button[^>]*data-slot="dialog-trigger"[^>]*>/)?.[0] ?? "";
		expect(trigger).toContain('aria-haspopup="dialog"');
		expect(trigger).toContain('aria-expanded="false"');
		expect(trigger).toContain(`aria-controls="${id}"`);
		expect(trigger).toContain('command="show-modal"');
		expect(trigger).toContain(`commandfor="${id}"`);
		expect(trigger).toContain('type="button"');
	});

	it("gives the title and description the ids the panel points at", () => {
		const markup = html(basic());
		const id = markup.match(/<dialog [^>]*id="([^"]+)-content"/)?.[1];
		expect(markup).toContain(
			`<h2 id="${id}-title" data-slot="dialog-title" class="rx-dialog-title">`,
		);
		expect(markup).toContain(`<p id="${id}-description" data-slot="dialog-description"`);
	});

	it("leaves the invoker off a morph or non-modal trigger", () => {
		for (const props of [{ morph: true }, { modal: false }]) {
			const markup = html(basic(props));
			expect(markup).not.toContain("commandfor");
		}
		expect(html(basic({ morph: true }))).toMatch(/data-slot="dialog-trigger"[^>]*data-morph=""/);
	});

	it("merges into its child with asChild", () => {
		const markup = html(
			<Dialog>
				<DialogTrigger asChild>
					<a href="#x" className="link">
						Open
					</a>
				</DialogTrigger>
			</Dialog>,
		);
		expect(markup).toMatch(/^<a href="#x" class="link"[^>]*aria-haspopup="dialog"/);
		expect(markup).not.toContain("<button");
	});

	it("unwraps a child that a Server Component streamed as a lazy reference", () => {
		const element = <a href="#lazy">Open</a>;
		const payload = Object.assign(Promise.resolve(element), {
			status: "fulfilled",
			value: element,
		});
		const lazy = { $$typeof: Symbol.for("react.lazy"), _payload: payload, _init: () => element };
		const markup = html(
			<Dialog>
				<DialogTrigger asChild>{lazy as unknown as React.ReactElement}</DialogTrigger>
			</Dialog>,
		);
		expect(markup).toMatch(/^<a href="#lazy"[^>]*data-slot="dialog-trigger"/);
	});

	it("takes the side, the size, no close button and no light dismiss", () => {
		const markup = html(
			<Dialog>
				<DialogContent side="right" size="lg" showClose={false} dismissible={false}>
					<DialogTitle>Settings</DialogTitle>
				</DialogContent>
			</Dialog>,
		);
		expect(markup).toContain('class="rx-surface rx-dialog rx-dialog-lg rx-dialog-right"');
		expect(markup).toContain('closedby="closerequest"');
		expect(markup).not.toContain("rx-dialog-close");
	});

	it("needs a Dialog around its parts", () => {
		expect(() => html(<DialogTitle>Lost</DialogTitle>)).toThrow(/inside <Dialog>/);
	});
});
