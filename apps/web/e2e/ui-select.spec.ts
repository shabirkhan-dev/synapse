import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: select", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/select");
		await expect(page.getByRole("heading", { name: "Select", level: 1 })).toBeVisible();
	});

	test("the label names it, the hint describes it and a choice sets the value", async ({
		page,
	}) => {
		const select = page.getByLabel("Framework");
		await expect(select).toHaveAccessibleDescription("What the project is built with.");
		await select.selectOption("astro");
		await expect(select).toHaveValue("astro");
	});

	test("the placeholder is muted until an option is chosen", async ({ page }) => {
		const select = page.getByLabel("Framework");
		const color = () => select.evaluate((el) => getComputedStyle(el).color);
		await expect(select).toHaveValue("");
		const muted = await color();
		await select.selectOption("next");
		expect(await color()).not.toBe(muted);
	});

	test("heights are 32, 40 and 48", async ({ page }) => {
		const heights = await Promise.all(
			["sm", "md", "lg"].map(
				async (name) =>
					(await page.getByRole("combobox", { name, exact: true }).boundingBox())?.height,
			),
		);
		expect(heights).toEqual([32, 40, 48]);
	});

	test("the list is drawn by the page, unfolds below, and the keyboard picks a row", async ({
		page,
	}) => {
		const select = page.getByLabel("Framework");
		expect(await select.evaluate((el) => getComputedStyle(el).appearance)).toBe("base-select");
		await select.click();
		await expect(select).toHaveAttribute("data-side", "bottom");
		const option = page.getByRole("option", { name: "Remix" });
		await expect(option).toBeVisible();
		expect((await option.boundingBox())?.height).toBe(32);
		// The list sits 8px below the trigger once it has pulled away.
		await page.waitForTimeout(400);
		const trigger = await select.boundingBox();
		const first = await page.getByRole("option", { name: "Next.js" }).boundingBox();
		expect(Math.round((first?.y ?? 0) - ((trigger?.y ?? 0) + (trigger?.height ?? 0)))).toBe(
			8 + 1 + 4,
		);
		// Nothing is chosen yet, so focus starts on the first row.
		await expect(page.getByRole("option", { name: "Next.js" })).toBeFocused();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await expect(select).toHaveValue("remix");
		await select.click();
		await page.keyboard.press("Escape");
		await expect(option).toBeHidden();
	});

	test("the chosen row carries the tick and the chevron turns over while open", async ({
		page,
	}) => {
		const select = page.getByLabel("Time zone");
		const chevron = select.locator("xpath=following-sibling::span[1]");
		await expect(chevron).toHaveCSS("rotate", "none");
		await select.click();
		const chosen = page.getByRole("option", { name: "Karachi (UTC+5)" });
		await expect(chosen).toHaveJSProperty("selected", true);
		expect(await chosen.evaluate((el) => getComputedStyle(el, "::checkmark").visibility)).toBe(
			"visible",
		);
		expect(
			await page
				.getByRole("option", { name: "London (UTC+0)" })
				.evaluate((el) => getComputedStyle(el, "::checkmark").visibility),
		).not.toBe("visible");
		await expect(chevron).toHaveCSS("rotate", "180deg");
		await page.keyboard.press("Escape");
	});

	test("an error turns the edge red and disabled states are disabled", async ({ page }) => {
		const invalid = page.getByLabel("Plan");
		await expect(invalid).toHaveAttribute("aria-invalid", "true");
		await expect(invalid).toHaveAccessibleDescription("Choose a plan to continue.");
		await expect(invalid).toHaveCSS("border-top-color", "rgb(229, 72, 77)");
		await expect(page.getByLabel("Region")).toBeDisabled();
		await invalid.click();
		await expect(page.getByRole("option", { name: "Team (sold out)" })).toBeDisabled();
		await page.keyboard.press("Escape");
	});

	test("a controlled select reports its value", async ({ page }) => {
		await page.getByLabel("Status").selectOption("done");
		await expect(page.getByText("Value: done")).toBeVisible();
	});

	test("focus turns the edge blue, and motion off opens without animating", async ({ page }) => {
		const select = page.getByLabel("Framework");
		await select.focus();
		await page.keyboard.press("Tab");
		await page.keyboard.press("Shift+Tab");
		await expect(select).toHaveCSS("border-top-color", "rgb(45, 124, 246)");
		await mode(page, "off").click();
		await select.click();
		const names = await page.evaluate(() => {
			const el = document.querySelector<HTMLSelectElement>("select.rx-select");
			return el ? getComputedStyle(el, "::picker(select)").animationName : "";
		});
		expect(names).toBe("none");
	});

	test("the page fits a phone", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		const { scrollWidth, clientWidth } = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		}));
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
	});
});
