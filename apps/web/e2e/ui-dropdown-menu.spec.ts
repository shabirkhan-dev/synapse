import { expect, type Locator, type Page, test } from "@playwright/test";

const trigger = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const hydrated = (el: Locator) =>
	expect
		.poll(() => el.evaluate((node) => Object.keys(node).some((key) => key.startsWith("__react"))))
		.toBe(true);
const item = (menu: Locator, name: string) => menu.getByRole("menuitem", { name, exact: false });

test.describe("rabtx docs: dropdown menu", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/dropdown-menu");
		await expect(page.getByRole("heading", { name: "Dropdown Menu", level: 1 })).toBeVisible();
		await hydrated(trigger(page, "My account"));
	});

	test("opens a labelled menu from the keyboard on the first row", async ({ page }) => {
		const open = trigger(page, "My account");
		await expect(open).toHaveAttribute("aria-haspopup", "menu");
		await open.focus();
		await page.keyboard.press("Enter");
		const menu = page.getByRole("menu", { name: "My account" });
		await expect(menu).toBeVisible();
		await expect(open).toHaveAttribute("aria-expanded", "true");
		await expect(item(menu, "Profile")).toBeFocused();
		await expect(menu.getByRole("group").first()).toHaveAccessibleName("Ada Lovelace");
		await expect(item(menu, "Keyboard shortcuts")).toHaveAttribute("aria-disabled", "true");
		await expect(menu.getByRole("separator").first()).toBeAttached();
	});

	test("arrows rove and wrap, skip disabled rows, Home/End and typeahead", async ({ page }) => {
		await trigger(page, "My account").focus();
		await page.keyboard.press("Enter");
		const menu = page.getByRole("menu", { name: "My account" });
		await expect(item(menu, "Profile")).toBeFocused();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("ArrowDown");
		await expect(item(menu, "Settings")).toBeFocused();
		await page.keyboard.press("ArrowDown");
		await expect(item(menu, "Invite people")).toBeFocused();
		await page.keyboard.press("End");
		await expect(item(menu, "Log out")).toBeFocused();
		await page.keyboard.press("ArrowDown");
		await expect(item(menu, "Profile")).toBeFocused();
		await page.keyboard.press("ArrowUp");
		await expect(item(menu, "Log out")).toBeFocused();
		await page.keyboard.press("Home");
		await expect(item(menu, "Profile")).toBeFocused();
		await page.keyboard.press("n");
		await expect(item(menu, "New team")).toBeFocused();
		await page.waitForTimeout(600);
		await page.keyboard.press("b");
		await expect(item(menu, "Billing")).toBeFocused();
	});

	test("ArrowUp on the trigger opens on the last row", async ({ page }) => {
		await trigger(page, "My account").focus();
		await page.keyboard.press("ArrowUp");
		const menu = page.getByRole("menu", { name: "My account" });
		await expect(item(menu, "Log out")).toBeFocused();
	});

	test("Escape closes it and focus returns to the trigger", async ({ page }) => {
		const open = trigger(page, "My account");
		await open.click();
		const menu = page.getByRole("menu", { name: "My account" });
		await expect(menu).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(menu).toBeHidden();
		await expect(open).toBeFocused();
		await expect(open).toHaveAttribute("aria-expanded", "false");
	});

	test("submenus open with ArrowRight and go back with ArrowLeft and Escape", async ({ page }) => {
		const open = trigger(page, "My account");
		await open.focus();
		await page.keyboard.press("Enter");
		const menu = page.getByRole("menu", { name: "My account" });
		const sub = item(menu, "Invite people");
		// Opening focuses the first row; wait for it before moving on.
		await expect(item(menu, "Profile")).toBeFocused();
		await sub.focus();
		await expect(sub).toHaveAttribute("aria-haspopup", "menu");
		await page.keyboard.press("ArrowRight");
		const submenu = page.getByRole("menu", { name: "Invite people" });
		await expect(submenu).toBeVisible();
		await expect(sub).toHaveAttribute("aria-expanded", "true");
		await expect(item(submenu, "Email")).toBeFocused();
		// Beside its row, to the right.
		const row = await sub.boundingBox();
		const panel = await submenu.boundingBox();
		expect(panel!.x).toBeGreaterThanOrEqual(row!.x + row!.width - 1);

		await page.keyboard.press("ArrowLeft");
		await expect(submenu).toBeHidden();
		await expect(sub).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(item(submenu, "Email")).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(submenu).toBeHidden();
		await expect(menu).toBeVisible();
		await expect(sub).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(menu).toBeHidden();
		await expect(open).toBeFocused();
	});

	test("hover opens a submenu and choosing a row closes everything", async ({ page }) => {
		const open = trigger(page, "My account");
		await open.click();
		const menu = page.getByRole("menu", { name: "My account" });
		await item(menu, "Invite people").hover();
		const submenu = page.getByRole("menu", { name: "Invite people" });
		await expect(submenu).toBeVisible();
		await item(submenu, "Message").click();
		await expect(submenu).toBeHidden();
		await expect(menu).toBeHidden();
		await expect(open).toBeFocused();
	});

	test("checkbox rows toggle and can keep the menu open", async ({ page }) => {
		const open = trigger(page, "View");
		await hydrated(open);
		await open.evaluate((node) => node.scrollIntoView({ block: "center" }));
		await open.click();
		const menu = page.getByRole("menu", { name: "View" });
		const panel = menu.getByRole("menuitemcheckbox", { name: "Panel" });
		await expect(panel).toHaveAttribute("aria-checked", "false");
		await panel.click();
		await expect(panel).toHaveAttribute("aria-checked", "true");
		await expect(menu).toBeVisible();
		await panel.press(" ");
		await expect(panel).toHaveAttribute("aria-checked", "false");
		const disabled = menu.getByRole("menuitemcheckbox", { name: "Activity bar" });
		await disabled.click({ force: true });
		await expect(disabled).toHaveAttribute("aria-checked", "false");
	});

	test("radio rows pick one value", async ({ page }) => {
		const open = page.getByRole("button", { name: /^Panel: / });
		await hydrated(open);
		await expect(open).toHaveText("Panel: bottom");
		await open.click();
		const menu = page.getByRole("menu", { name: "Panel: bottom" });
		await expect(menu.getByRole("menuitemradio", { name: "Bottom" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		await menu.getByRole("menuitemradio", { name: "Right" }).click();
		await expect(menu).toBeHidden();
		await expect(open).toHaveText("Panel: right");
		await open.click();
		const again = page.getByRole("menu", { name: "Panel: right" });
		await expect(again.locator('[role="menuitemradio"][aria-checked="true"]')).toHaveCount(1);
		await expect(again.getByRole("menuitemradio", { name: "Right" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
	});

	test("a right-click opens the context menu at the pointer", async ({ page }) => {
		const area = page.getByLabel("Q3 roadmap card");
		await hydrated(area);
		await area.scrollIntoViewIfNeeded();
		const b = (await area.boundingBox())!;
		await page.mouse.click(b.x + 40, b.y + 30, { button: "right" });
		const menu = page.getByRole("menu", { name: "Context menu" });
		await expect(menu).toBeVisible();
		const m = (await menu.boundingBox())!;
		expect(Math.abs(m.x - (b.x + 40))).toBeLessThan(12);
		expect(Math.abs(m.y - (b.y + 30))).toBeLessThan(12);
		await item(menu, "Duplicate").click();
		await expect(menu).toBeHidden();
		await expect(area).toContainText("Duplicate");
	});

	test("Shift+F10 opens the context menu from the keyboard", async ({ page }) => {
		const area = page.getByLabel("Q3 roadmap card");
		await hydrated(area);
		await area.focus();
		await page.keyboard.press("Shift+F10");
		const menu = page.getByRole("menu", { name: "Context menu" });
		await expect(menu).toBeVisible();
		await expect(item(menu, "Rename")).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(menu).toBeHidden();
	});
});
