import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: toggle", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/toggle");
		await expect(page.getByRole("heading", { name: "Toggle", level: 1 })).toBeVisible();
	});

	test("it is a switch, named by its label, and the label click and Space toggle it", async ({
		page,
	}) => {
		const toggle = page.getByRole("switch", { name: "Weekly digest" });
		await expect(toggle).not.toBeChecked();
		await page.locator("label", { hasText: "Weekly digest" }).click();
		await expect(toggle).toBeChecked();
		await toggle.press("Space");
		await expect(toggle).not.toBeChecked();
	});

	test("the track is 28 by 16, accent when on and gray when off", async ({ page }) => {
		const on = page.getByRole("switch", { name: "Email notifications" });
		const off = page.getByRole("switch", { name: "Weekly digest" });
		expect(await on.boundingBox()).toMatchObject({ width: 28, height: 16 });
		await expect(on).toHaveCSS("background-color", "rgb(45, 124, 246)");
		await expect(off).toHaveCSS("background-color", "rgb(227, 227, 227)");
	});

	test("the 12px thumb slides 12px when on", async ({ page }) => {
		const thumb = (name: string) =>
			page.getByRole("switch", { name }).evaluate((el) => {
				const style = getComputedStyle(el, "::before");
				return [style.width, style.translate];
			});
		expect(await thumb("Weekly digest")).toEqual(["12px", "none"]);
		expect(await thumb("Email notifications")).toEqual(["12px", "12px"]);
	});

	test("the click area is 24px tall", async ({ page }) => {
		const toggle = page.getByRole("switch", { name: "Weekly digest" });
		const rect = await toggle.boundingBox();
		if (!rect) throw new Error("no toggle");
		await page.mouse.click(rect.x + 14, rect.y - 3);
		await expect(toggle).toBeChecked();
	});

	test("a disabled toggle cannot be switched and shows the Figma colors", async ({ page }) => {
		const off = page.getByRole("switch", { name: "Beta features (not available)" });
		const on = page.getByRole("switch", { name: "Security alerts (always on)" });
		await expect(off).toBeDisabled();
		await page.locator("label", { hasText: "Beta features" }).click({ force: true });
		await expect(off).not.toBeChecked();
		await expect(off).toHaveCSS("background-color", "rgb(242, 242, 242)");
		await expect(on).toHaveCSS("background-color", "rgb(211, 228, 253)");
	});

	test("the controlled example follows its state", async ({ page }) => {
		const toggle = page.getByRole("switch", { name: "Auto-save" });
		await expect(page.locator("span", { hasText: "saved automatically" })).toBeVisible();
		await toggle.click();
		await expect(toggle).not.toBeChecked();
		await expect(page.locator("span", { hasText: "saved when you press Save" })).toBeVisible();
	});

	test("keyboard focus shows a 2px ring", async ({ page }) => {
		const toggle = page.getByRole("switch", { name: "Weekly digest" });
		await toggle.focus();
		await page.keyboard.press("Tab");
		await page.keyboard.press("Shift+Tab");
		await expect(toggle).toBeFocused();
		await expect(toggle).toHaveCSS("outline-width", "2px");
	});

	test("the track is round by default and square in Sharp", async ({ page }) => {
		const toggle = page.getByRole("switch", { name: "Weekly digest" });
		const radius = () => toggle.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		expect(Number.parseFloat(await radius())).toBeGreaterThanOrEqual(8);
		await mode(page, "sharp").click();
		expect(await radius()).toBe("2px");
	});
});
