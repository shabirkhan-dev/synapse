import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

/** The drawn circle around a radio (the input itself is an invisible, larger target). */
const circleOf = (input: Locator) => input.locator("xpath=..");
/** The gliding dot: the group's ::after, positioned over the checked circle. */
const dot = (group: Locator) =>
	group.evaluate((el) => {
		const style = getComputedStyle(el, "::after");
		return { top: parseFloat(style.top), left: parseFloat(style.left), opacity: style.opacity };
	});
/** The centre of a circle, relative to its group. */
const centre = async (group: Locator, input: Locator) => {
	const [g, c] = await Promise.all([group.boundingBox(), circleOf(input).boundingBox()]);
	if (!g || !c) throw new Error("not rendered");
	return { top: c.y + c.height / 2 - g.y, left: c.x + c.width / 2 - g.x };
};

test.describe("rabtx docs: radio group", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/radio-group");
		await expect(page.getByRole("heading", { name: "Radio Group", level: 1 })).toBeVisible();
	});

	test("the label names an option and clicking the text chooses it", async ({ page }) => {
		const group = page.getByRole("radiogroup", { name: "Plan", exact: true });
		const pro = group.getByRole("radio", { name: "Pro, $12 a month" });
		const team = group.getByRole("radio", { name: "Team, $29 a month" });
		await expect(pro).toBeChecked();
		await page.locator("label", { hasText: "Team, $29 a month" }).click();
		await expect(team).toBeChecked();
		await expect(pro).not.toBeChecked();
	});

	test("the arrow keys move the choice, wrap and skip disabled options", async ({ page }) => {
		const group = page.getByRole("radiogroup", { name: "Plan", exact: true });
		const radio = (name: string) => group.getByRole("radio", { name });
		await radio("Pro, $12 a month").focus();
		await page.keyboard.press("ArrowDown");
		await expect(radio("Team, $29 a month")).toBeChecked();
		await expect(radio("Team, $29 a month")).toBeFocused();
		// Legacy is disabled, so the next stop wraps to the first option.
		await page.keyboard.press("ArrowDown");
		await expect(radio("Starter, free")).toBeChecked();
		await page.keyboard.press("ArrowUp");
		await expect(radio("Team, $29 a month")).toBeChecked();
		await page.keyboard.press("ArrowLeft");
		await expect(radio("Pro, $12 a month")).toBeChecked();
	});

	test("the group is one tab stop: Tab leaves it from the chosen option", async ({ page }) => {
		const group = page.getByRole("radiogroup", { name: "Density" });
		await group.getByRole("radio", { name: "Compact" }).focus();
		await page.keyboard.press("ArrowRight");
		await expect(group.getByRole("radio", { name: "Comfortable" })).toBeChecked();
		await page.keyboard.press("Shift+Tab");
		await page.keyboard.press("Tab");
		await expect(group.getByRole("radio", { name: "Comfortable" })).toBeFocused();
		await page.keyboard.press("Tab");
		const inGroup = await group.evaluate((el) => el.contains(document.activeElement));
		expect(inGroup).toBe(false);
	});

	test("circles are 16, 20 and 24 with a primary edge when chosen", async ({ page }) => {
		const sizes = [
			["Small, 16px", 16],
			["Medium, 20px", 20],
			["Large, 24px", 24],
		] as const;
		const circles = sizes.map(([name]) => circleOf(page.getByRole("radio", { name })));
		const rects = await Promise.all(circles.map((circle) => circle.boundingBox()));
		for (const [i, [, size]] of sizes.entries()) {
			expect(rects[i]).toMatchObject({ width: size, height: size });
		}
		const styles = await Promise.all(
			circles.map((circle) =>
				circle.evaluate((el) => {
					const style = getComputedStyle(el);
					return [style.borderTopColor, style.borderTopLeftRadius];
				}),
			),
		);
		for (const style of styles) expect(style).toEqual(["rgb(45, 124, 246)", "50%"]);
	});

	test("the dot glides from the old choice to the new one", async ({ page }) => {
		const group = page.getByRole("radiogroup", { name: "Plan", exact: true });
		const from = await centre(group, group.getByRole("radio", { name: "Pro, $12 a month" }));
		const starter = group.getByRole("radio", { name: "Starter, free" });
		const to = await centre(group, starter);
		expect(await dot(group)).toMatchObject({ ...from, opacity: "1" });
		await starter.click();
		await page.waitForTimeout(80);
		const mid = await dot(group);
		expect(mid.top).toBeLessThan(from.top - 1);
		expect(mid.top).toBeGreaterThan(to.top + 1);
		await expect.poll(async () => (await dot(group)).top).toBe(to.top);
		expect((await dot(group)).left).toBe(to.left);
	});

	test("the click target reaches 24px around a 16px circle", async ({ page }) => {
		const input = page.getByRole("radio", { name: "Another option" }).first();
		await input.scrollIntoViewIfNeeded();
		expect(await input.boundingBox()).toMatchObject({ width: 24, height: 24 });
		const rect = await circleOf(input).boundingBox();
		if (!rect) throw new Error("no circle");
		await page.mouse.click(rect.x - 3, rect.y + 8);
		await expect(input).toBeChecked();
	});

	test("the description describes an option without joining its name", async ({ page }) => {
		const option = page.getByRole("radio", { name: "Run once", exact: true });
		await expect(option).toHaveAccessibleDescription("Runs a single time, right now.");
	});

	test("disabled options and groups cannot be chosen", async ({ page }) => {
		const legacy = page.getByRole("radio", { name: "Legacy plan" });
		await expect(legacy).toBeDisabled();
		await page.locator("label", { hasText: "Legacy plan" }).click({ force: true });
		await expect(legacy).not.toBeChecked();
		await expect(circleOf(legacy)).toHaveCSS("opacity", "0.5");
		const group = page.getByRole("radiogroup", { name: "Disabled group" });
		await expect(group.getByRole("radio", { name: "Not chosen, disabled" })).toBeDisabled();
		await expect(
			group.getByRole("radio", { name: "Chosen, disabled", exact: true }),
		).toBeDisabled();
		await expect(group.getByRole("radio", { name: "Chosen, disabled", exact: true })).toBeChecked();
	});

	test("a Field names the group, links its error and turns the circles red", async ({ page }) => {
		const group = page.getByRole("radiogroup", { name: "Shipping" });
		await expect(group).toHaveAttribute("aria-invalid", "true");
		await expect(group).toHaveAccessibleDescription("Choose a shipping speed to continue.");
		const express = group.getByRole("radio", { name: "Express" });
		await expect(circleOf(express)).toHaveCSS("border-top-color", "rgb(229, 72, 77)");
		await express.click();
		await expect(circleOf(express)).toHaveCSS("border-top-color", "rgb(45, 124, 246)");
	});

	test("keyboard focus shows a 2px ring on the circle, or on a whole card", async ({ page }) => {
		const team = page.getByRole("radio", { name: "Team, $29 a month" });
		await team.focus();
		await page.keyboard.press("ArrowUp");
		const pro = page.getByRole("radio", { name: "Pro, $12 a month" });
		await expect(pro).toBeFocused();
		await expect(circleOf(pro)).toHaveCSS("outline-width", "2px");
		const card = page.getByRole("radio", { name: "Team", exact: true });
		await card.focus();
		await page.keyboard.press("ArrowUp");
		const starter = page.getByRole("radio", { name: "Starter", exact: true });
		await expect(starter).toBeChecked();
		const label = page.locator(".rx-radio-item", { has: starter });
		await expect(label).toHaveCSS("outline-width", "2px");
		await expect(circleOf(starter)).toHaveCSS("outline-style", "none");
	});

	test("a choice card is chosen by clicking anywhere on it", async ({ page }) => {
		const group = page.getByRole("radiogroup", { name: "Workspace plan" });
		const starter = group.getByRole("radio", { name: "Starter", exact: true });
		const card = starter.locator("xpath=ancestor::label[1]");
		await card.getByText("For one person and a side project.").click();
		await expect(starter).toBeChecked();
		await expect(card).toHaveCSS("border-top-color", "rgb(45, 124, 246)");
		await expect(starter).toHaveAccessibleDescription("For one person and a side project.");
		await expect(group.getByRole("radio", { name: "Scale", exact: true })).toBeDisabled();
	});

	test("controlled state follows the arrow keys", async ({ page }) => {
		const group = page.getByRole("radiogroup", { name: "Theme" });
		await group.getByRole("radio", { name: "System" }).focus();
		await page.keyboard.press("ArrowUp");
		await expect(group.getByRole("radio", { name: "Dark" })).toBeChecked();
		await expect(page.getByText("Value: dark")).toBeVisible();
	});

	test("cards follow the radius mode, the circle stays round", async ({ page }) => {
		const starter = page.getByRole("radio", { name: "Starter", exact: true });
		const card = page.locator(".rx-radio-item", { has: starter });
		const radius = () => card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		expect(await radius()).toBe("8px");
		await mode(page, "sharp").click();
		expect(await radius()).toBe("2px");
		await mode(page, "round").click();
		expect(await radius()).toBe("12px");
		await expect(circleOf(starter)).toHaveCSS("border-top-left-radius", "50%");
	});

	test("motion off still moves the dot, at once", async ({ page }) => {
		await mode(page, "off").click();
		const group = page.getByRole("radiogroup", { name: "Plan", exact: true });
		const starter = group.getByRole("radio", { name: "Starter, free" });
		const to = await centre(group, starter);
		await starter.click();
		expect(await dot(group)).toMatchObject({ ...to, opacity: "1" });
	});

	test("reduced motion moves the dot without gliding", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const group = page.getByRole("radiogroup", { name: "Plan", exact: true });
		const starter = group.getByRole("radio", { name: "Starter, free" });
		const to = await centre(group, starter);
		await starter.click();
		expect(await dot(group)).toMatchObject(to);
		await expect(circleOf(starter)).toHaveCSS("scale", "none");
	});
});
