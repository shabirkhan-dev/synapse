import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });
const trigger = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
/** Whether the focused element is inside the locator. */
const focusIn = (el: Locator) => el.evaluate((node) => node.contains(document.activeElement));
const style = (el: Locator, prop: string) =>
	el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), prop);

test.describe("rabtx docs: dialog", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/dialog");
		await expect(page.getByRole("heading", { name: "Dialog", level: 1 })).toBeVisible();
		// Hydrated: the trigger has dropped its pre-hydration invoker attributes.
		await expect(trigger(page, "Share project")).not.toHaveAttribute("command");
	});

	test("opens a named, described modal and moves focus in", async ({ page }) => {
		const open = trigger(page, "Share project");
		await expect(open).toHaveAttribute("aria-haspopup", "dialog");
		await expect(open).toHaveAttribute("aria-expanded", "false");
		await open.click();

		const dialog = page.getByRole("dialog", { name: "Share project" });
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAccessibleDescription(/Anyone with the link/);
		await expect(open).toHaveAttribute("aria-expanded", "true");
		await expect(open).toHaveAttribute("aria-controls", (await dialog.getAttribute("id")) ?? "");
		expect(await dialog.evaluate((node) => node.matches(":modal"))).toBe(true);
		expect(await focusIn(dialog)).toBe(true);
		await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
		// The page behind does not scroll.
		expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
			"hidden",
		);
	});

	test("the close button closes it and focus returns to the trigger", async ({ page }) => {
		const open = trigger(page, "Share project");
		await open.click();
		const dialog = page.getByRole("dialog", { name: "Share project" });
		await dialog.getByRole("button", { name: "Close" }).click();
		await expect(dialog).toBeHidden();
		await expect(open).toBeFocused();
		await expect(open).toHaveAttribute("aria-expanded", "false");
		expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
			"hidden",
		);
	});

	test("Escape closes it and focus returns to the trigger", async ({ page }) => {
		const open = trigger(page, "Share project");
		await open.click();
		const dialog = page.getByRole("dialog", { name: "Share project" });
		await expect(dialog).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(open).toBeFocused();
	});

	test("a press on the backdrop closes it; a press on the panel does not", async ({ page }) => {
		const open = trigger(page, "Share project");
		await open.click();
		const dialog = page.getByRole("dialog", { name: "Share project" });
		await expect(dialog).toBeVisible();
		await dialog.getByText("Anyone with the link").click();
		await expect(dialog).toBeVisible();
		await page.mouse.click(8, 8);
		await expect(dialog).toBeHidden();
		await expect(open).toBeFocused();
	});

	test("Tab cycles inside the dialog and never reaches the page behind", async ({ page }) => {
		await trigger(page, "Share project").click();
		const dialog = page.getByRole("dialog", { name: "Share project" });
		await expect(dialog).toBeVisible();
		const seen = new Set<string>();
		// Each press moves from where the last one left focus, so they run in order.
		/* oxlint-disable no-await-in-loop */
		for (let i = 0; i < 8; i++) {
			await page.keyboard.press(i % 3 === 2 ? "Shift+Tab" : "Tab");
			const where = await page.evaluate(() => {
				const el = document.activeElement;
				if (!el || el === document.body) return "browser";
				return el.closest("dialog[open]")
					? el.textContent || el.getAttribute("aria-label") || ""
					: `OUT ${el.outerHTML.slice(0, 80)}`;
			});
			expect(where, "focus left the dialog for the page").not.toMatch(/^OUT/);
			seen.add(where);
		}
		/* oxlint-enable no-await-in-loop */
		// It cycles over the actions and the close button.
		expect([...seen]).toEqual(expect.arrayContaining(["Copy link", "Close"]));
	});

	test("a destructive confirm has no close button and ignores the backdrop", async ({ page }) => {
		await trigger(page, "Delete project").click();
		const dialog = page.getByRole("dialog", { name: "Delete “Q3 roadmap”?" });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Close" })).toHaveCount(0);
		await expect(dialog.getByRole("button", { name: "Keep project" })).toBeFocused();
		await page.mouse.click(8, 8);
		await expect(dialog).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(trigger(page, "Delete project")).toBeFocused();
	});

	test("a form inside: invalid stays open, a valid submit closes and saves", async ({ page }) => {
		await trigger(page, "Edit profile").click();
		const dialog = page.getByRole("dialog", { name: "Edit profile" });
		const name = dialog.getByLabel("Name", { exact: true });
		await expect(name).toBeFocused();
		await name.fill("");
		await dialog.getByRole("button", { name: "Save" }).click();
		await expect(dialog).toBeVisible();
		await name.fill("Ada Lovelace");
		await name.press("Enter");
		await expect(dialog).toBeHidden();
		await expect(page.getByText("Signed in as Ada Lovelace")).toBeVisible();
	});

	test("nested: Escape closes only the top dialog", async ({ page }) => {
		await trigger(page, "Workspace settings").click();
		const outer = page.getByRole("dialog", { name: "Workspace settings" });
		const leave = outer.getByRole("button", { name: "Leave workspace" });
		await leave.click();
		const inner = page.getByRole("dialog", { name: "Leave Acme?" });
		await expect(inner).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(inner).toBeHidden();
		await expect(outer).toBeVisible();
		await expect(leave).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(outer).toBeHidden();
		await expect(trigger(page, "Workspace settings")).toBeFocused();
	});

	for (const [size, width] of [
		["sm", 384],
		["md", 512],
		["lg", 672],
	] as const) {
		test(`size ${size} caps the width at ${width}px`, async ({ page }) => {
			await trigger(page, size).click();
			const dialog = page.getByRole("dialog", { name: `Size ${size}` });
			await expect(dialog).toBeVisible();
			// Polled: the box is scaled until the enter spring settles.
			await expect
				.poll(async () => Math.round((await dialog.boundingBox())?.width ?? 0))
				.toBe(width);
			await page.keyboard.press("Escape");
			await expect(dialog).toBeHidden();
		});
	}

	test("morph hides the trigger while open and hands focus back", async ({ page }) => {
		const open = trigger(page, "Upgrade plan");
		await open.click();
		const dialog = page.getByRole("dialog", { name: "Upgrade to Team" });
		await expect(dialog).toBeVisible();
		await expect.poll(() => style(open, "opacity")).toBe("0");
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await expect(open).toBeFocused();
		await expect.poll(() => style(open, "opacity")).toBe("1");
	});

	test("sheets sit against the right and bottom edges", async ({ page }) => {
		const viewport = page.viewportSize();
		if (!viewport) throw new Error("no viewport");
		await trigger(page, "Right sheet").click();
		const right = page.getByRole("dialog", { name: "Notifications" });
		await expect(right).toBeVisible();
		await expect
			.poll(async () => {
				const box = await right.boundingBox();
				return box && [Math.round(box.x + box.width), Math.round(box.height)];
			})
			.toEqual([viewport.width, viewport.height]);
		await page.keyboard.press("Escape");
		await expect(right).toBeHidden();

		await trigger(page, "Bottom sheet").click();
		const bottom = page.getByRole("dialog", { name: "Move to" });
		await expect
			.poll(async () => {
				const box = await bottom.boundingBox();
				return box && Math.round(box.y + box.height);
			})
			.toBe(viewport.height);
		await bottom.getByRole("button", { name: "Backlog" }).click();
		await expect(bottom).toBeHidden();
	});

	test("motion off opens and closes with no transition", async ({ page }) => {
		await mode(page, "off").click();
		await trigger(page, "Share project").click();
		const dialog = page.getByRole("dialog", { name: "Share project" });
		await expect(dialog).toBeVisible();
		expect(await style(dialog, "transition-duration")).toMatch(/^0s(, 0s)*$/);
		expect(await style(dialog, "opacity")).toBe("1");
	});
});
