import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

/** The drawn box around a checkbox (the input itself is an invisible, larger target). */
const boxOf = (input: Locator) => input.locator("xpath=..");
const edge = (box: Locator) => box.evaluate((el) => getComputedStyle(el).borderTopColor);

test.describe("rabtx docs: checkbox", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/checkbox");
		await expect(page.getByRole("heading", { name: "Checkbox", level: 1 })).toBeVisible();
	});

	test("the label names it and clicking the text toggles it", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Share anonymous usage data" });
		await expect(box).not.toBeChecked();
		await page.locator("label", { hasText: "Share anonymous usage data" }).click();
		await expect(box).toBeChecked();
		await box.press("Space");
		await expect(box).not.toBeChecked();
	});

	test("boxes are 16, 20 and 24, primary when on and background when off", async ({ page }) => {
		const sizes = [
			["Small, 16px", 16],
			["Medium, 20px", 20],
			["Large, 24px", 24],
		] as const;
		const rects = await Promise.all(
			sizes.map(([name]) => boxOf(page.getByRole("checkbox", { name })).boundingBox()),
		);
		for (const [i, [, size]] of sizes.entries()) {
			expect(rects[i]).toMatchObject({ width: size, height: size });
		}
		const on = boxOf(page.getByRole("checkbox", { name: "Email me product updates" }));
		const off = boxOf(page.getByRole("checkbox", { name: "Share anonymous usage data" }));
		await expect(on).toHaveCSS("background-color", "rgb(45, 124, 246)");
		await expect(off).toHaveCSS("background-color", "rgb(255, 255, 255)");
	});

	test("hover darkens only an empty box's edge", async ({ page }) => {
		const on = boxOf(page.getByRole("checkbox", { name: "Email me product updates" }));
		const off = boxOf(page.getByRole("checkbox", { name: "Share anonymous usage data" }));
		const rest = await edge(off);
		await off.hover();
		await expect.poll(() => edge(off)).not.toBe(rest);
		await on.hover();
		await expect.poll(() => edge(on)).toBe("rgb(45, 124, 246)");
	});

	test("the tick draws in and fades out with the state", async ({ page }) => {
		const input = page.getByRole("checkbox", { name: "Share anonymous usage data" });
		const tick = boxOf(input).locator(".rx-checkbox-check");
		const offset = () =>
			tick.locator("path").evaluate((el) => getComputedStyle(el).strokeDashoffset);
		await expect(tick).toHaveCSS("opacity", "0");
		await input.check();
		await expect(tick).toHaveCSS("opacity", "1");
		await expect.poll(offset).toBe("0px");
		await input.uncheck();
		await expect(tick).toHaveCSS("opacity", "0");
		await expect.poll(offset).toBe("1px");
	});

	test("the click target reaches 24px around a 16px box", async ({ page }) => {
		const input = page.getByRole("checkbox", { name: "Small, 16px" });
		await input.scrollIntoViewIfNeeded();
		const rect = await boxOf(input).boundingBox();
		if (!rect) throw new Error("no box");
		expect(await input.boundingBox()).toMatchObject({ width: 24, height: 24 });
		await page.mouse.click(rect.x - 3, rect.y + 8);
		await expect(input).not.toBeChecked();
	});

	test("the description describes it without joining the name", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Comments", exact: true });
		await expect(box).toHaveAccessibleDescription("Replies on threads you started.");
	});

	test("a disabled checkbox cannot be toggled", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Beta features (not available)" });
		await expect(box).toBeDisabled();
		await page
			.locator("label", { hasText: "Beta features (not available)" })
			.click({ force: true });
		await expect(box).not.toBeChecked();
		await expect(boxOf(box)).toHaveCSS("opacity", "0.5");
	});

	test("select all is mixed, then checked, then clear", async ({ page }) => {
		const all = page.getByRole("checkbox", { name: "All teams" });
		const mixed = () => all.evaluate((el: HTMLInputElement) => el.indeterminate);
		await expect.poll(mixed).toBe(true);
		await expect(boxOf(all).locator(".rx-checkbox-dash")).toHaveCSS("opacity", "1");
		await all.click();
		await expect(all).toBeChecked();
		expect(await mixed()).toBe(false);
		await all.click();
		await expect(all).not.toBeChecked();
		await page.getByRole("checkbox", { name: "Growth" }).click();
		await expect.poll(mixed).toBe(true);
	});

	test("a controlled indeterminate box stays mixed when clicked", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Partly on" });
		await box.click();
		expect(await box.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
		await expect(box).not.toBeChecked();
	});

	test("controlled state follows the click", async ({ page }) => {
		await page.getByRole("checkbox", { name: "I agree to the terms" }).click();
		await expect(page.getByText("Checked: true")).toBeVisible();
	});

	test("a Field error marks it invalid with a red edge", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Terms", exact: true });
		await expect(box).toHaveAttribute("aria-invalid", "true");
		await expect(box).toHaveAccessibleDescription("Accept the terms to continue.");
		await expect(boxOf(box)).toHaveCSS("border-top-color", "rgb(229, 72, 77)");
	});

	test("keyboard focus shows a 2px ring on the box", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Share anonymous usage data" });
		await box.focus();
		await page.keyboard.press("Tab");
		await page.keyboard.press("Shift+Tab");
		await expect(box).toBeFocused();
		await expect(boxOf(box)).toHaveCSS("outline-width", "2px");
	});

	test("the radius follows the checkbox tier and Round stays a square", async ({ page }) => {
		const box = boxOf(page.getByRole("checkbox", { name: "Small, 16px" }));
		const radius = () => box.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		expect(await radius()).toBe("4px");
		await mode(page, "sharp").click();
		expect(await radius()).toBe("2px");
		await mode(page, "round").click();
		expect(await radius()).toBe("6px");
	});

	test("motion off still shows every state, at once", async ({ page }) => {
		await mode(page, "off").click();
		const input = page.getByRole("checkbox", { name: "Share anonymous usage data" });
		const tick = boxOf(input).locator(".rx-checkbox-check");
		await input.check();
		expect(await tick.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
	});
});
