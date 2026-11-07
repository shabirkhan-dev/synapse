import { expect, type Locator, type Page, test } from "@playwright/test";

const trigger = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
/** React has attached to the node, so its handlers are live. */
const hydrated = (el: Locator) =>
	expect
		.poll(() => el.evaluate((node) => Object.keys(node).some((key) => key.startsWith("__react"))))
		.toBe(true);
const box = (el: Locator) => el.evaluate((node) => node.getBoundingClientRect().toJSON());

test.describe("rabtx docs: popover", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/popover");
		await expect(page.getByRole("heading", { name: "Popover", level: 1 })).toBeVisible();
		await hydrated(trigger(page, "Dimensions"));
	});

	test("opens a named, non-modal panel below the trigger and moves focus in", async ({ page }) => {
		const open = trigger(page, "Dimensions");
		await expect(open).toHaveAttribute("aria-haspopup", "dialog");
		await expect(open).toHaveAttribute("aria-expanded", "false");
		await open.click();

		const panel = page.getByRole("dialog", { name: "Dimensions" });
		await expect(panel).toBeVisible();
		await expect(panel).toHaveAccessibleDescription(/width and height/);
		await expect(open).toHaveAttribute("aria-expanded", "true");
		await expect(open).toHaveAttribute("aria-controls", (await panel.getAttribute("id")) ?? "");
		expect(await panel.evaluate((node) => node.matches(":popover-open"))).toBe(true);
		expect(await panel.evaluate((node) => node.matches(":modal"))).toBe(false);
		await expect(panel.getByRole("textbox").first()).toBeFocused();

		// Anchored: below the trigger, centered on it.
		const t = await box(open);
		const p = await box(panel);
		expect(p.top).toBeGreaterThanOrEqual(t.bottom);
		expect(Math.abs(p.left + p.width / 2 - (t.left + t.width / 2))).toBeLessThan(2);
	});

	test("Escape closes it and focus returns to the trigger", async ({ page }) => {
		const open = trigger(page, "Dimensions");
		await open.click();
		const panel = page.getByRole("dialog", { name: "Dimensions" });
		await expect(panel).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(panel).toBeHidden();
		await expect(open).toBeFocused();
		await expect(open).toHaveAttribute("aria-expanded", "false");
	});

	test("a press outside light-dismisses it", async ({ page }) => {
		await trigger(page, "Dimensions").click();
		const panel = page.getByRole("dialog", { name: "Dimensions" });
		await expect(panel).toBeVisible();
		await page.mouse.click(5, 5);
		await expect(panel).toBeHidden();
	});

	for (const side of ["top", "right", "bottom", "left"]) {
		test(`side="${side}" places the panel on that side of its trigger`, async ({ page }) => {
			const open = trigger(page, side);
			await open.evaluate((node) => node.scrollIntoView({ block: "center" }));
			await open.click();
			const panel = page.locator(`#${await open.getAttribute("aria-controls")}`);
			await expect(panel).toBeVisible();
			// Untitled, so the trigger names it.
			await expect(panel).toHaveAccessibleName(side);
			const t = await box(open);
			const p = await box(panel);
			if (side === "top") expect(p.bottom).toBeLessThanOrEqual(t.top + 1);
			if (side === "bottom") expect(p.top).toBeGreaterThanOrEqual(t.bottom - 1);
			if (side === "left") expect(p.right).toBeLessThanOrEqual(t.left + 1);
			if (side === "right") expect(p.left).toBeGreaterThanOrEqual(t.right - 1);
		});
	}

	test("flips to the top when there is no room below", async ({ page }) => {
		const open = trigger(page, "Dimensions");
		// Cut the viewport off just under the trigger.
		const { bottom } = await box(open);
		await page.setViewportSize({ width: 1280, height: Math.ceil(bottom + 40) });
		await open.click();
		const panel = page.getByRole("dialog", { name: "Dimensions" });
		await expect(panel).toBeVisible();
		await expect(panel).toHaveAttribute("data-flip", /block/);
		expect((await box(panel)).bottom).toBeLessThanOrEqual((await box(open)).top + 1);
	});

	test("PopoverClose and a controlled close both hide it", async ({ page }) => {
		const open = trigger(page, "Share");
		await hydrated(open);
		const status = page.getByText(/· (Not shared|Link copied)/);
		await open.click();
		const panel = page.getByRole("dialog", { name: "Share “Q3 roadmap”" });
		await expect(panel).toBeVisible();
		await expect(status).toHaveText("Open · Not shared");
		await panel.getByRole("button", { name: "Cancel" }).click();
		await expect(panel).toBeHidden();
		await expect(status).toHaveText("Closed · Not shared");

		await open.click();
		await panel.getByRole("button", { name: "Copy link" }).click();
		await expect(panel).toBeHidden();
		await expect(status).toHaveText("Closed · Link copied");
		await expect(open).toBeFocused();
	});

	test("reduced motion keeps only the fade", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await trigger(page, "Dimensions").click();
		const surface = page.getByRole("dialog", { name: "Dimensions" }).locator(".rx-popover-surface");
		await expect(surface).toBeVisible();
		expect(await surface.evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
	});
});
