import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: textarea", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/textarea");
		await expect(page.getByRole("heading", { name: "Textarea", level: 1 })).toBeVisible();
	});

	test("the label names it, the hint describes it and typing works", async ({ page }) => {
		const textarea = page.getByLabel("Description");
		await expect(textarea).toHaveAccessibleDescription("Shown on the project page.");
		await textarea.fill("Line one\nLine two");
		await expect(textarea).toHaveValue("Line one\nLine two");
	});

	test("the minimum height is 96px", async ({ page }) => {
		const box = await page.getByLabel("Description").boundingBox();
		expect(box?.height).toBe(96);
	});

	test("focus turns the edge blue", async ({ page }) => {
		const textarea = page.getByLabel("Description");
		await textarea.focus();
		await expect(textarea).toHaveCSS("border-top-color", "rgb(45, 124, 246)");
	});

	test("an error turns the edge red and a disabled one is disabled", async ({ page }) => {
		const invalid = page.getByLabel("Notes", { exact: true });
		await expect(invalid).toHaveAttribute("aria-invalid", "true");
		await expect(invalid).toHaveAccessibleDescription("Notes can be at most 200 characters.");
		await expect(invalid).toHaveCSS("border-top-color", "rgb(229, 72, 77)");
		await expect(page.getByLabel("Archived notes")).toBeDisabled();
	});

	test("it grows with its text and keeps the look in Flat", async ({ page }) => {
		const textarea = page.getByLabel("Description");
		const before = await textarea.boundingBox();
		await textarea.fill(Array.from({ length: 8 }, (_, i) => `Line ${i + 1}`).join("\n"));
		expect((await textarea.boundingBox())?.height).toBeGreaterThan(before?.height ?? 0);
		await textarea.fill("");
		await mode(page, "flat").click();
		expect(await textarea.boundingBox()).toEqual(before);
	});
});
