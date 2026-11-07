import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("header label", { hasText: new RegExp(`^${name}$`, "i") });

/** The value bubble that belongs to a thumb (its next sibling). */
const bubbleOf = (input: Locator) => input.locator("xpath=following-sibling::span[1]");
const opacity = (el: Locator) => el.evaluate((node) => Number(getComputedStyle(node).opacity));
/** The slider root around an input. */
const rootOf = (input: Locator) => input.locator("xpath=ancestor::div[@data-slot='slider']");

test.describe("rabtx docs: slider", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/slider");
		await expect(page.getByRole("heading", { name: "Slider", level: 1 })).toBeVisible();
	});

	test("each thumb is a native slider, named and valued", async ({ page }) => {
		const volume = page.getByRole("slider", { name: "Volume", exact: true }).first();
		await expect(volume).toHaveAttribute("type", "range");
		await expect(volume).toHaveValue("40");
		await expect(page.getByRole("slider", { name: "Price range Minimum" })).toHaveValue("20");
		await expect(page.getByRole("slider", { name: "Price range Maximum" })).toHaveValue("80");
	});

	test("the keyboard moves a thumb, the fill and the bubble follow", async ({ page }) => {
		const volume = page.getByRole("slider", { name: "Volume", exact: true }).first();
		const root = rootOf(volume);
		await volume.focus();
		await page.keyboard.press("ArrowRight");
		await expect(volume).toHaveValue("41");
		await expect(root).toHaveAttribute("style", /--_hi:\s*0\.41/);
		await expect(bubbleOf(volume)).toHaveText("41");
		await page.keyboard.press("ArrowLeft");
		await page.keyboard.press("ArrowLeft");
		await expect(volume).toHaveValue("39");
		await page.keyboard.press("PageUp");
		await expect(volume).toHaveValue("49");
		await page.keyboard.press("End");
		await expect(volume).toHaveValue("100");
		await page.keyboard.press("Home");
		await expect(volume).toHaveValue("0");
		await expect(root).toHaveAttribute("style", /--_hi:\s*0[;"]/);
	});

	test("focus shows a 2px ring on the thumb and pops the bubble out", async ({ page }) => {
		const volume = page.getByRole("slider", { name: "Volume", exact: true }).first();
		const bubble = bubbleOf(volume);
		await expect.poll(() => opacity(bubble)).toBe(0);
		await page.getByRole("link", { name: "Slider" }).focus();
		await volume.focus();
		await page.keyboard.press("ArrowRight");
		await expect.poll(() => opacity(bubble)).toBe(1);
		const ring = await volume.evaluate((node) =>
			getComputedStyle(node).getPropertyValue("--_focus"),
		);
		expect(ring.trim()).not.toBe("transparent");
		// The bubble springs in on the swap spring (a linear() easing).
		expect(
			await bubble.evaluate((node) => getComputedStyle(node).transitionTimingFunction),
		).toMatch(/linear\(/);
		await volume.blur();
		await expect.poll(() => opacity(bubble)).toBe(0);
	});

	test("range thumbs never cross, from the keyboard", async ({ page }) => {
		const low = page.getByRole("slider", { name: "Price range Minimum" });
		const high = page.getByRole("slider", { name: "Price range Maximum" });
		await low.focus();
		await page.keyboard.press("End");
		await expect(low).toHaveValue("80");
		await page.keyboard.press("ArrowRight");
		await expect(low).toHaveValue("80");
		await high.focus();
		await page.keyboard.press("Home");
		await expect(high).toHaveValue("80");
		await page.keyboard.press("ArrowRight");
		await expect(high).toHaveValue("81");
		// Both at the maximum: the lower thumb stays reachable on top and can still move down.
		await page.keyboard.press("End");
		await low.focus();
		await page.keyboard.press("End");
		await expect(low).toHaveValue("100");
		await expect(low.locator("xpath=..")).toHaveAttribute("data-top", "");
	});

	test("minStepsBetweenThumbs keeps a gap, and the commit follows the keyboard", async ({
		page,
	}) => {
		// The controlled example's thumbs (the form further down has a "Price" range too).
		const low = page.getByRole("slider", { name: "Price Minimum", exact: true }).first();
		const high = page.getByRole("slider", { name: "Price Maximum", exact: true }).first();
		await expect(low).toHaveAttribute("aria-valuetext", "$200");
		await low.focus();
		await page.keyboard.press("End");
		// 10 steps of 10 below the upper thumb.
		await expect(low).toHaveValue("700");
		await expect(low).toHaveAttribute("aria-valuetext", "$700");
		await expect(page.getByText("$700 to $800 (last committed $700 to $800)")).toBeVisible();
		await high.focus();
		await page.keyboard.press("Home");
		await expect(high).toHaveValue("800");
	});

	test("pressing the bare track of a range moves the nearest thumb there", async ({ page }) => {
		const low = page.getByRole("slider", { name: "Price range Minimum" });
		const high = page.getByRole("slider", { name: "Price range Maximum" });
		const box = await low.boundingBox();
		if (!box) throw new Error("no slider");
		// 90% along: nearer the upper thumb (80).
		await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
		await expect(high).toHaveValue(/^(8[89]|9[0-2])$/);
		await expect(high).toBeFocused();
		// 5% along: the lower thumb.
		await page.mouse.click(box.x + box.width * 0.05, box.y + box.height / 2);
		await expect(low).toHaveValue(/^[0-9]$/);
		await expect(low).toBeFocused();
	});

	test("dragging a single slider's thumb moves it and grows it", async ({ page }) => {
		const volume = page.getByRole("slider", { name: "Volume", exact: true }).first();
		const box = await volume.boundingBox();
		if (!box) throw new Error("no slider");
		await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 5 });
		await expect.poll(() => opacity(bubbleOf(volume))).toBe(1);
		expect(await volume.evaluate((node) => getComputedStyle(node).getPropertyValue("--_sx"))).toBe(
			"1.2",
		);
		await page.mouse.up();
		await expect(volume).toHaveValue(/^7[3-7]$/);
	});

	test("a form submits each slider under its name, one entry per range thumb", async ({ page }) => {
		const submit = page.getByRole("button", { name: "Submit" });
		await submit.click();
		await expect(page.getByText("volume=50 price=25,75")).toBeVisible();
		const volume = page.getByRole("slider", { name: "Volume", exact: true }).last();
		await volume.focus();
		await page.keyboard.press("ArrowRight");
		const max = page.getByRole("slider", { name: "Price Maximum" }).last();
		await max.focus();
		await page.keyboard.press("PageDown");
		await submit.click();
		await expect(page.getByText("volume=51 price=25,65")).toBeVisible();
	});

	test("a Field names, describes and invalidates the slider", async ({ page }) => {
		const volume = page.getByRole("slider", { name: "Volume", exact: true }).last();
		await expect(volume).toHaveAccessibleDescription(/Arrow keys move it by 1/);
		const budget = page.getByRole("slider", { name: "Budget" });
		await expect(budget).toHaveAttribute("aria-invalid", "true");
		await expect(budget).toHaveAccessibleDescription("Pick a budget of at least 20.");
		await expect(page.getByRole("slider", { name: "Price Minimum" }).last()).toHaveAttribute(
			"aria-labelledby",
			/ /,
		);
	});

	test("a disabled slider ignores the pointer and stays put", async ({ page }) => {
		const brightness = page.getByRole("slider", { name: "Brightness" });
		await expect(brightness).toBeDisabled();
		const box = await brightness.boundingBox();
		if (!box) throw new Error("no slider");
		await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
		await expect(brightness).toHaveValue("30");
	});

	test("marks fill the datalist and light up inside the fill", async ({ page }) => {
		const quality = page.getByRole("slider", { name: "Quality" });
		const list = await quality.getAttribute("list");
		expect(list).toBeTruthy();
		await expect(page.locator(`datalist[id="${list}"] option`)).toHaveCount(5);
		const marks = rootOf(quality).locator(".rx-slider-mark");
		await expect(marks.filter({ hasText: "Medium" })).toHaveAttribute("data-in", "");
		await expect(marks.filter({ hasText: "High" })).not.toHaveAttribute("data-in");
		await quality.focus();
		await page.keyboard.press("ArrowRight");
		await expect(quality).toHaveValue("75");
	});

	test("the ruler reads out the value with its unit", async ({ page }) => {
		const weight = page.getByRole("slider", { name: "Weight" });
		const readout = rootOf(weight).locator(".rx-slider-readout");
		await expect(readout).toHaveText("72.5 kg");
		await weight.focus();
		await page.keyboard.press("ArrowRight");
		await expect(readout).toHaveText("73.0 kg");
		await expect(weight).toHaveAttribute("aria-valuetext", "73.0 kg");
	});

	test("vertical sliders stand up and go up with ArrowUp", async ({ page }) => {
		const bass = page.getByRole("slider", { name: "Bass" });
		await expect(bass).toHaveAttribute("aria-orientation", "vertical");
		await bass.focus();
		await page.keyboard.press("ArrowUp");
		await expect(bass).toHaveValue("71");
		const box = await bass.boundingBox();
		if (!box) throw new Error("no slider");
		expect(box.height).toBeGreaterThan(box.width * 3);
		// The top of the track is the maximum.
		await page.mouse.click(box.x + box.width / 2, box.y + 4);
		await expect(bass).toHaveValue(/^(9[5-9]|100)$/);
	});

	test("right to left fills from the right", async ({ page }) => {
		const rtl = page.getByRole("slider", { name: "مستوى الصوت" });
		expect(
			await rootOf(rtl).evaluate((node) =>
				getComputedStyle(node).getPropertyValue("--_dir").trim(),
			),
		).toBe("to left");
		await rtl.focus();
		await page.keyboard.press("ArrowLeft");
		// In right-to-left text ArrowLeft moves toward the end, so the value grows.
		await expect(rtl).toHaveValue("31");
	});

	test("motion off keeps every state but moves nothing", async ({ page }) => {
		await mode(page, "off").click();
		const volume = page.getByRole("slider", { name: "Volume", exact: true }).first();
		const bubble = bubbleOf(volume);
		await expect
			.poll(() => bubble.evaluate((node) => getComputedStyle(node).transitionDuration))
			.toBe("0s");
		await volume.focus();
		await page.keyboard.press("ArrowRight");
		expect(await opacity(bubble)).toBe(1);
	});
});
