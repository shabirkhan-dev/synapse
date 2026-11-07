import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
/** The tooltip a trigger points at, by its aria-describedby or aria-labelledby. */
async function tooltipOf(page: Page, trigger: Locator) {
	const id =
		(await trigger.getAttribute("aria-describedby")) ??
		(await trigger.getAttribute("aria-labelledby"));
	expect(id).toBeTruthy();
	return page.locator(`[id="${id}"]`);
}
const shown = (el: Locator) => el.evaluate((node) => node.matches(":popover-open"));
const box = async (el: Locator) => {
	const rect = await el.boundingBox();
	if (!rect) throw new Error("no box");
	return rect;
};

test.describe("rabtx docs: tooltip", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/tooltip");
		await expect(page.getByRole("heading", { name: "Tooltip", level: 1 })).toBeVisible();
		// Hydrated: the triggers have dropped their pre-hydration interest invokers.
		await expect(button(page, "Publish")).not.toHaveAttribute("interestfor");
	});

	test("hover opens a hint popover above the trigger after the delay", async ({ page }) => {
		const trigger = button(page, "Publish");
		const tip = await tooltipOf(page, trigger);
		await expect(tip).toHaveAttribute("role", "tooltip");
		await expect(tip).toHaveAttribute("popover", "hint");
		await expect(trigger).toHaveAccessibleDescription("Make this page public");
		await expect(tip).toBeHidden();

		await trigger.hover();
		// Not yet: the delay is 120ms.
		expect(await shown(tip)).toBe(false);
		await expect(tip).toBeVisible();
		expect(await shown(tip)).toBe(true);
		await expect(tip).toHaveAttribute("data-placed", "top");
		await expect(trigger).toHaveAttribute("data-state", "open");
		// Placed by anchor positioning: above the trigger with the 6px gap, centered on it.
		const t = await box(trigger);
		const c = await box(tip);
		expect(Math.round(t.y - (c.y + c.height))).toBe(6);
		expect(Math.abs(c.x + c.width / 2 - (t.x + t.width / 2))).toBeLessThan(1.5);

		await page.mouse.move(5, 5);
		await expect(tip).toBeHidden();
		await expect(trigger).toHaveAttribute("data-state", "closed");
	});

	test("the pointer can move onto the label without it closing", async ({ page }) => {
		const trigger = button(page, "Publish");
		const tip = await tooltipOf(page, trigger);
		await trigger.hover();
		await expect(tip).toBeVisible();
		const c = await box(tip);
		await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 4 });
		await page.waitForTimeout(300);
		await expect(tip).toBeVisible();
		await page.mouse.move(5, 5);
		await expect(tip).toBeHidden();
	});

	test("keyboard focus opens it at once; Escape and blur close it", async ({ page }) => {
		const trigger = button(page, "Publish");
		const tip = await tooltipOf(page, trigger);
		await trigger.focus();
		await page.keyboard.press("Shift+Tab");
		await page.keyboard.press("Tab");
		await expect(trigger).toBeFocused();
		await expect(tip).toBeVisible({ timeout: 100 });

		await page.keyboard.press("Escape");
		await expect(tip).toBeHidden();
		await expect(trigger).toBeFocused();

		await page.keyboard.press("Shift+Tab");
		await page.keyboard.press("Tab");
		await expect(tip).toBeVisible();
		await page.keyboard.press("Tab");
		await expect(tip).toBeHidden();
	});

	test("a mouse press hides it until the pointer leaves", async ({ page }) => {
		const trigger = button(page, "Publish");
		const tip = await tooltipOf(page, trigger);
		await trigger.hover();
		await expect(tip).toBeVisible();
		await trigger.click();
		await expect(tip).toBeHidden();
		await page.waitForTimeout(300);
		await expect(tip).toBeHidden();
	});

	test("the arrow points at the trigger on every side", async ({ page }) => {
		// Each side is hovered after the last one closed, so they run in order.
		/* oxlint-disable no-await-in-loop */
		for (const side of ["top", "right", "bottom", "left"]) {
			const trigger = button(page, side[0].toUpperCase() + side.slice(1));
			const tip = await tooltipOf(page, trigger);
			await trigger.hover();
			await expect(tip).toBeVisible();
			await expect(tip).toHaveAttribute("data-placed", side);
			const arrow = tip.locator(".rx-tooltip-arrow");
			const a = await box(arrow);
			const t = await box(trigger);
			const vertical = side === "top" || side === "bottom";
			const along = vertical
				? a.x + a.width / 2 - (t.x + t.width / 2)
				: a.y + a.height / 2 - (t.y + t.height / 2);
			expect(Math.abs(along), side).toBeLessThan(1.5);
			await page.mouse.move(5, 5);
			await expect(tip).toBeHidden();
		}
		/* oxlint-enable no-await-in-loop */
	});

	test("flips to the other side when there is no room", async ({ page }) => {
		const trigger = button(page, "Bottom");
		const tip = await tooltipOf(page, trigger);
		// Scroll it to the bottom edge of the viewport, then point at it without scrolling again.
		await trigger.evaluate((node) =>
			window.scrollBy(0, node.getBoundingClientRect().bottom - window.innerHeight + 12),
		);
		const t = await box(trigger);
		await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
		await expect(tip).toBeVisible();
		await expect(tip).toHaveAttribute("data-placed", "top");
		const c = await box(tip);
		expect(c.y + c.height).toBeLessThan(t.y);
		// The arrow turned with it: it now hangs from the bottom edge.
		const a = await box(tip.locator(".rx-tooltip-arrow"));
		expect(a.y).toBeGreaterThan(c.y + c.height - a.height);
	});

	test("a toolbar names its icon buttons and skips the delay after the first", async ({ page }) => {
		const bold = button(page, "Bold");
		const italic = button(page, "Italic");
		// The name is the label alone: the key caps are hidden, the shortcut is aria-keyshortcuts.
		await expect(bold).toHaveAttribute("aria-keyshortcuts", "Meta+B");
		expect(await bold.getAttribute("aria-describedby")).toBeNull();
		const boldTip = await tooltipOf(page, bold);
		await expect(boldTip).toHaveAttribute("aria-hidden", "true");

		await bold.hover();
		await expect(boldTip).toBeVisible();
		const italicTip = await tooltipOf(page, italic);
		await italic.hover();
		// Inside the skip delay it opens at once (the provider's delay is 300ms), and alone.
		await expect(italicTip).toBeVisible({ timeout: 150 });
		await expect(boldTip).toBeHidden();
		await expect(page.locator("[role=tooltip]:popover-open")).toHaveCount(1);
	});

	test("controlled: onOpenChange reports changes and open holds it", async ({ page }) => {
		const trigger = button(page, "Sync now");
		const tip = await tooltipOf(page, trigger);
		await page.getByRole("checkbox", { name: "Keep it open" }).check();
		await expect(tip).toBeVisible();
		await page.mouse.move(5, 5);
		await page.keyboard.press("Escape");
		await page.waitForTimeout(250);
		await expect(tip).toBeVisible();
		// A press elsewhere light-dismisses a hint popover; held open, it comes straight back.
		await page.getByRole("heading", { name: "Tooltip", level: 1 }).click();
		await page.waitForTimeout(250);
		await expect(tip).toBeVisible();
		await page.getByRole("checkbox", { name: "Keep it open" }).uncheck();
		await expect(tip).toBeHidden();
	});

	test("a long label wraps inside 20rem and stays in the viewport", async ({ page }) => {
		const trigger = button(page, "net 30");
		const tip = await tooltipOf(page, trigger);
		await trigger.hover();
		await expect(tip).toBeVisible();
		const c = await box(tip);
		expect(c.width).toBeLessThanOrEqual(320);
		expect(c.height).toBeGreaterThan(30);
		expect(c.x).toBeGreaterThanOrEqual(8);
	});

	test("enters from @starting-style and drops it with Motion off", async ({ page }) => {
		const trigger = button(page, "Publish");
		const tip = await tooltipOf(page, trigger);
		const timing = () =>
			tip.evaluate((node) => {
				const style = getComputedStyle(node);
				return { duration: style.transitionDuration, scale: style.scale };
			});
		await trigger.hover();
		await expect(tip).toBeVisible();
		expect((await timing()).duration).not.toMatch(/^0s(, 0s)*$/);
		await page.mouse.move(5, 5);
		await expect(tip).toBeHidden();

		await mode(page, "Off").click();
		await trigger.hover();
		await expect(tip).toBeVisible();
		const off = await timing();
		expect(off.duration).toMatch(/^0s(, 0s)*$/);
		expect(off.scale).toBe("none");
	});
});

test.describe("rabtx docs: tooltip on touch", () => {
	test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

	test("a tap toggles it and a tap elsewhere closes it", async ({ page }) => {
		await page.goto("/ui/tooltip");
		const trigger = button(page, "Publish");
		await expect(trigger).not.toHaveAttribute("interestfor");
		const tip = await tooltipOf(page, trigger);
		await trigger.tap();
		await expect(tip).toBeVisible();
		// Inside the viewport less 8px on a phone.
		const c = await box(tip);
		expect(c.x).toBeGreaterThanOrEqual(7.5);
		expect(c.x + c.width).toBeLessThanOrEqual(390 - 7.5);
		await page.getByRole("heading", { name: "Tooltip", level: 1 }).tap();
		await expect(tip).toBeHidden();
		await trigger.tap();
		await expect(tip).toBeVisible();
		await trigger.tap();
		await expect(tip).toBeHidden();
	});
});
