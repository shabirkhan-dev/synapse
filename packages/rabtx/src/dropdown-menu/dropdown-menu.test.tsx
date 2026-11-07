import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "./context-menu";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./dropdown-menu";
import { menuParts, nextIndex, typeaheadMatch } from "./dropdown-menu.styles";

const css = readFileSync(new URL("../styles/dropdown-menu.css", import.meta.url), "utf8");
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

const menu = html(
	<DropdownMenu>
		<DropdownMenuTrigger>Options</DropdownMenuTrigger>
		<DropdownMenuContent className="w-56">
			<DropdownMenuGroup>
				<DropdownMenuLabel>Account</DropdownMenuLabel>
				<DropdownMenuItem icon={<svg />} shortcut="⌘P">
					Profile
				</DropdownMenuItem>
				<DropdownMenuItem disabled>Billing</DropdownMenuItem>
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuCheckboxItem checked>Status bar</DropdownMenuCheckboxItem>
			<DropdownMenuRadioGroup value="b">
				<DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
				<DropdownMenuRadioItem value="b">B</DropdownMenuRadioItem>
			</DropdownMenuRadioGroup>
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
				<DropdownMenuSubContent>
					<DropdownMenuItem>Email</DropdownMenuItem>
				</DropdownMenuSubContent>
			</DropdownMenuSub>
			<DropdownMenuItem variant="destructive" textValue="Delete">
				Delete
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>,
);

describe("DropdownMenu markup", () => {
	it("makes the trigger a menu button that invokes the popover and names the menu", () => {
		const trigger = menu.match(/<button[^>]*>/)?.[0] ?? "";
		const triggerId = trigger.match(/ id="([^"]+)"/)?.[1];
		const menuId = trigger.match(/popoverTarget="([^"]+)"/)?.[1];
		expect(trigger).toContain('aria-haspopup="menu"');
		expect(trigger).toContain('aria-expanded="false"');
		expect(trigger).toContain(`aria-controls="${menuId}"`);
		expect(trigger).toMatch(/anchor-name:--anchor-/);
		expect(menu).toContain(
			`<div role="menu" aria-labelledby="${triggerId}" aria-orientation="vertical" tabindex="-1" id="${menuId}" popover="auto" class="rx-popover" data-side="bottom" data-align="start"`,
		);
	});

	it("draws the panel on the popover surface with the highlight last", () => {
		expect(menu).toContain('class="rx-surface rx-popover-surface rx-menu w-56"');
		expect(menu).toMatch(
			/<span class="rx-menu-highlight" aria-hidden="true"><\/span><\/div><\/div>$/,
		);
	});

	it("renders rows that roving focus can reach, with their parts", () => {
		expect(menu).toMatch(/<div role="menuitem" tabindex="-1"[^>]*class="rx-menu-item"/);
		expect(menu).toContain('<span class="rx-menu-icon" aria-hidden="true"><svg></svg></span>');
		expect(menu).toContain(
			'<span data-slot="dropdown-menu-shortcut" class="rx-menu-shortcut">⌘P</span>',
		);
		expect(menu).toMatch(
			/aria-disabled="true" data-disabled=""[^>]*><span class="rx-menu-text">Billing/,
		);
		expect(menu).toMatch(/data-variant="destructive" data-text-value="Delete"/);
		expect(menu).toContain('role="separator" aria-orientation="horizontal"');
		expect(menu).toContain('role="group"');
	});

	it("marks checkbox and radio rows with aria-checked", () => {
		expect(menu).toMatch(/role="menuitemcheckbox"[^>]*aria-checked="true"/);
		expect(menu).toMatch(/role="menuitemradio"[^>]*aria-checked="false"[^>]*>.*?A</);
		expect(menu).toMatch(/role="menuitemradio"[^>]*aria-checked="true"/);
		expect(menu).toContain('<path d="M5 14L8.5 17.5L19 6.5" pathLength="1"></path>');
		expect(menu).toContain('class="rx-menu-dot"');
	});

	it("nests a submenu: a row that opens a menu anchored to it", () => {
		const row = menu.match(/<div role="menuitem"[^>]*rx-menu-subtrigger[^>]*>/)?.[0] ?? "";
		expect(row).toContain('aria-haspopup="menu"');
		expect(row).toContain('aria-expanded="false"');
		const anchor = row.match(/--_anchor:(--anchor-[\w-]+)/)?.[1];
		expect(anchor).toBeTruthy();
		expect(menu).toMatch(
			new RegExp(
				`data-side="right" data-align="start" style="position-anchor:${anchor};--_offset:6px"`,
			),
		);
	});

	it("throws outside a menu", () => {
		expect(() => html(<DropdownMenuItem>Lost</DropdownMenuItem>)).toThrow(/inside a menu/);
		expect(() => html(<DropdownMenuTrigger>Lost</DropdownMenuTrigger>)).toThrow(/DropdownMenu/);
	});
});

describe("ContextMenu markup", () => {
	const out = html(
		<ContextMenu>
			<ContextMenuTrigger>Right-click here</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem>Copy</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>,
	);
	it("anchors the menu to an invisible point", () => {
		const anchor = out.match(/class="rx-menu-point" style="anchor-name:(--anchor-[\w-]+)"/)?.[1];
		expect(anchor).toBeTruthy();
		expect(out).toContain(`position-anchor:${anchor}`);
		expect(out).toContain('data-slot="context-menu-trigger"');
		expect(out).toMatch(/role="menu"[^>]*aria-label="Context menu"/);
	});
});

describe("navigation", () => {
	it("moves and wraps with the arrows and jumps with Home and End", () => {
		expect(nextIndex("ArrowDown", -1, 4)).toBe(0);
		expect(nextIndex("ArrowDown", 3, 4)).toBe(0);
		expect(nextIndex("ArrowUp", -1, 4)).toBe(3);
		expect(nextIndex("ArrowUp", 0, 4)).toBe(3);
		expect(nextIndex("Home", 2, 4)).toBe(0);
		expect(nextIndex("End", 0, 4)).toBe(3);
		expect(nextIndex("a", 0, 4)).toBe(-1);
		expect(nextIndex("ArrowDown", -1, 0)).toBe(-1);
	});

	it("matches typeahead after the current row and cycles a repeated letter", () => {
		const labels = ["Profile", "Billing", "Settings", "Share", "Sign out"];
		expect(typeaheadMatch(labels, -1, "s")).toBe(2);
		expect(typeaheadMatch(labels, 2, "s")).toBe(3);
		expect(typeaheadMatch(labels, 3, "ss")).toBe(4);
		expect(typeaheadMatch(labels, 4, "s")).toBe(2);
		expect(typeaheadMatch(labels, 2, "sh")).toBe(3);
		expect(typeaheadMatch(labels, 0, "SIG")).toBe(4);
		expect(typeaheadMatch(labels, 0, "x")).toBe(-1);
	});
});

describe("dropdown-menu.css", () => {
	it("has a rule for every part", () => {
		for (const name of Object.values(menuParts))
			expect(css, name).toMatch(new RegExp(`\\.${name}[\\s,{.:>\\[)]`));
	});

	it("glides one highlight between rows by scoped anchor positioning, with a fallback", () => {
		expect(css).toContain("anchor-scope: --_rx-row");
		expect(css).toContain("position-anchor: --_rx-row");
		expect(css).toContain("@supports not (anchor-scope: all)");
	});

	it("draws the tick on the check spring and the dot on the swap spring", () => {
		expect(css).toContain("var(--spring-check)");
		expect(css).toContain("var(--spring-swap)");
	});

	it("honours both motion switches in the rx-motion layer and casts no shadow", () => {
		expect(css).toMatch(
			/@layer rx-motion \{[\s\S]*prefers-reduced-motion: reduce[\s\S]*data-motion="off"/,
		);
		expect(css).not.toMatch(/box-shadow|--shadow-/);
		expect(css).not.toContain("!important");
	});
});
