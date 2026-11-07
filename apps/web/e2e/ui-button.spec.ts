import { expect, type Page, test } from "@playwright/test";

// The radios are visually hidden, so click their labels the way a person does.
const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: button", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/button");
		await expect(page.getByRole("heading", { name: "Button", level: 1 })).toBeVisible();
	});

	test("the toggles set the modes on the wrapper", async ({ page }) => {
		const wrapper = page.locator(".rabtx");
		await mode(page, "dark").click();
		await mode(page, "flat").click();
		await mode(page, "round").click();
		await mode(page, "off").click();
		await expect(wrapper).toHaveClass(/\bdark\b/);
		await expect(wrapper).toHaveAttribute("data-depth", "flat");
		await expect(wrapper).toHaveAttribute("data-radius", "round");
		await expect(wrapper).toHaveAttribute("data-motion", "off");
	});

	test("sizes are 32, 40 and 48 tall and the icon button is square", async ({ page }) => {
		const height = async (name: string) =>
			(await page.getByRole("button", { name, exact: true }).boundingBox())?.height;
		expect(await height("Small")).toBe(32);
		expect(await height("Medium")).toBe(40);
		expect(await height("Large")).toBe(48);
		const icon = await page.getByRole("button", { name: "Settings" }).first().boundingBox();
		expect(icon?.width).toBe(32);
		expect(icon?.height).toBe(32);
	});

	test("a ripple spawns at the press and removes itself", async ({ page }) => {
		const button = page.getByRole("button", { name: "Press me" });
		await button.click();
		await expect(button.locator(".rx-btn-ripple")).toHaveCount(1);
		await expect(button.locator(".rx-btn-ripple")).toHaveCount(0, { timeout: 4000 });
	});

	test("keyboard focus shows a 2px ring", async ({ page }) => {
		const button = page.getByRole("button", { name: "Primary" }).first();
		await button.focus();
		await page.keyboard.press("Tab");
		await page.keyboard.press("Shift+Tab");
		await expect(button).toBeFocused();
		await expect(button).toHaveCSS("outline-width", "2px");
	});

	test("a stateful button goes busy, succeeds and returns to idle", async ({ page }) => {
		// The accessible name follows the label, so hold on to the element, not the name.
		const button = page.locator("button[aria-live]").first();
		await expect(button).toHaveAccessibleName("Save changes");
		await button.click();
		await expect(button).toHaveAttribute("aria-busy", "true");
		await expect(button).toHaveAttribute("data-state", "loading");
		await expect(button).toHaveAttribute("data-state", "success");
		await expect(button).toHaveAccessibleName("Done");
		await expect(button).not.toHaveAttribute("aria-busy");
		await expect(button).toHaveAttribute("data-state", "idle", { timeout: 5000 });
	});

	test("the example source is shown and the page fits a phone", async ({ page }) => {
		await expect(page.getByText('variant="ghost"').first()).toBeAttached();
		await page.setViewportSize({ width: 375, height: 812 });
		const { scrollWidth, clientWidth } = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		}));
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
	});
});
