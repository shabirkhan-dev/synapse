import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("header label", { hasText: new RegExp(`^${name}$`, "i") });

/** The thumb's live geometry, read from the `::before` pseudo-element. */
const thumb = (el: Locator) =>
	el.evaluate((node) => {
		const style = getComputedStyle(node, "::before");
		return {
			width: Number.parseFloat(style.width),
			// The inset beyond the resting one (the thumb's top inset): how far it has travelled.
			x: Number.parseFloat(style.insetInlineStart) - Number.parseFloat(style.top),
			left: Number.parseFloat(style.left),
			right: Number.parseFloat(style.right),
			scale: style.scale,
			transition: style.transitionDuration,
		};
	});

test.describe("rabtx docs: switch", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/switch");
		await expect(page.getByRole("heading", { name: "Switch", level: 1 })).toBeVisible();
	});

	test("it is a switch named by its label, and clicking the text toggles it", async ({ page }) => {
		const wifi = page.getByRole("switch", { name: "Wi-Fi" });
		const plane = page.getByRole("switch", { name: "Airplane mode" });
		await expect(wifi).toBeChecked();
		await expect(plane).not.toBeChecked();
		await expect(plane).toHaveAttribute("type", "checkbox");
		await expect(plane).toHaveAttribute("switch", "");
		await page.locator("label", { hasText: "Airplane mode" }).click();
		await expect(plane).toBeChecked();
		await expect(page.getByRole("switch", { name: "Airplane mode", checked: true })).toBeVisible();
	});

	test("Space toggles it and focus shows a 2px ring", async ({ page }) => {
		const plane = page.getByRole("switch", { name: "Airplane mode" });
		await page.getByRole("switch", { name: "Wi-Fi" }).focus();
		await page.keyboard.press("Tab");
		await expect(plane).toBeFocused();
		await expect(plane).toHaveCSS("outline-width", "2px");
		await page.keyboard.press("Space");
		await expect(plane).toBeChecked();
		await page.keyboard.press("Space");
		await expect(plane).not.toBeChecked();
	});

	test("tracks are 36x20, 48x28 and 56x32, with the thumb inset on all sides", async ({ page }) => {
		const sizes = { sm: [36, 20, 14], md: [48, 28, 20], lg: [56, 32, 24] };
		for (const [name, [w, h, t]] of Object.entries(sizes)) {
			const el = page.getByRole("switch", { name, exact: true });
			expect(await el.boundingBox()).toMatchObject({ width: w, height: h });
			const geometry = await thumb(el);
			expect(geometry.width).toBe(t);
			// Checked: the thumb has travelled the track width minus its height.
			expect(geometry.x).toBe(w - h);
		}
	});

	test("the track is blue when on and gray when off, the thumb white", async ({ page }) => {
		const on = page.getByRole("switch", { name: "On", exact: true });
		const off = page.getByRole("switch", { name: "Off", exact: true });
		const fill = (el: Locator) =>
			el.evaluate((node) => getComputedStyle(node).getPropertyValue("--_fill").trim());
		await expect.poll(() => fill(on)).toBe("rgb(45, 124, 246)");
		expect(await fill(off)).not.toBe("rgb(45, 124, 246)");
		expect(await off.evaluate((node) => getComputedStyle(node, "::before").backgroundColor)).toBe(
			"rgb(255, 255, 255)",
		);
	});

	test("pressing stretches the thumb toward its destination and squishes it", async ({ page }) => {
		const plane = page.getByRole("switch", { name: "Airplane mode" });
		const box = await plane.boundingBox();
		if (!box) throw new Error("no switch");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await expect.poll(async () => (await thumb(plane)).width).toBe(24);
		const pressed = await thumb(plane);
		expect(pressed.scale).toBe("0.9");
		expect(pressed.x).toBe(0);
		await page.mouse.up();
		await expect(plane).toBeChecked();
		// Released and on: back to 20px, all the way across.
		await expect.poll(async () => thumb(plane)).toMatchObject({ width: 20, x: 20, scale: "1" });

		// Pressing an on switch grows it back toward the start, keeping the end edge still.
		await page.mouse.down();
		await expect.poll(async () => (await thumb(plane)).x).toBe(16);
		expect((await thumb(plane)).width).toBe(24);
		await page.mouse.up();
		await expect(plane).not.toBeChecked();
	});

	test("the thumb travels on the switch spring", async ({ page }) => {
		const plane = page.getByRole("switch", { name: "Airplane mode" });
		const style = await plane.evaluate((node) => {
			const s = getComputedStyle(node, "::before");
			return { property: s.transitionProperty, easing: s.transitionTimingFunction };
		});
		expect(style.property).toContain("inset-inline-start");
		expect(style.easing).toMatch(/^linear\(/);
		await plane.click();
		// Mid-flight the thumb is somewhere between the two ends.
		const samples: number[] = [];
		for (let i = 0; i < 6; i++) {
			samples.push((await thumb(plane)).x);
			await page.waitForTimeout(40);
		}
		expect(samples.some((x) => x > 0 && x < 20)).toBe(true);
		await expect.poll(async () => (await thumb(plane)).x).toBe(20);
	});

	test("a disabled switch cannot be toggled and does not stretch", async ({ page }) => {
		const locked = page.getByRole("switch", { name: "Location (managed by your admin)" });
		await expect(locked).toBeDisabled();
		const label = page.locator("label", { hasText: "Location (managed by your admin)" });
		await label.click({ force: true });
		await expect(locked).not.toBeChecked();
		const box = await locked.boundingBox();
		if (!box) throw new Error("no switch");
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		expect((await thumb(locked)).width).toBe(20);
		await page.mouse.up();
	});

	test("a Field names it, describes it and marks it invalid until it is on", async ({ page }) => {
		const marketing = page.getByRole("switch", { name: "Marketing emails" });
		await expect(marketing).toHaveAccessibleDescription("At most one a month.");
		const terms = page.getByRole("switch", { name: "Accept the terms" });
		await expect(terms).toHaveAttribute("aria-invalid", "true");
		await expect(terms).toHaveAccessibleDescription("Turn this on to continue.");
		await terms.click();
		await expect(terms).not.toHaveAttribute("aria-invalid");
	});

	test("controlled state follows the switch", async ({ page }) => {
		const notifications = page.getByRole("switch", { name: "Notifications" });
		await expect(page.getByText("Notifications are on")).toBeVisible();
		await notifications.click();
		await expect(page.getByText("Notifications are off")).toBeVisible();
	});

	test("a settings row toggles from anywhere on it", async ({ page }) => {
		const digest = page.getByRole("switch", { name: "Weekly digest" });
		// The text sits at the start of the row and the switch at the end.
		await page.locator("label", { hasText: "Weekly digest" }).click({ position: { x: 8, y: 10 } });
		await expect(digest).toBeChecked();
	});

	test("in right-to-left text the thumb travels the other way", async ({ page }) => {
		const rtl = await thumb(page.getByRole("switch", { name: "الإشعارات" }));
		// On: travelled 20px from the right edge, so it now sits at the left.
		expect(rtl.x).toBe(20);
		expect(rtl.left).toBeLessThan(rtl.right);
		const ltr = await thumb(page.getByRole("switch", { name: "Wi-Fi" }));
		expect(ltr.left).toBeGreaterThan(ltr.right);
	});

	test("motion off still switches, instantly", async ({ page }) => {
		await mode(page, "off").click();
		const plane = page.getByRole("switch", { name: "Airplane mode" });
		await expect.poll(async () => (await thumb(plane)).transition).toBe("0s");
		await plane.click();
		expect((await thumb(plane)).x).toBe(20);
	});

	test("radius follows the button tier: a capsule, nearly square in Sharp", async ({ page }) => {
		const plane = page.getByRole("switch", { name: "Airplane mode" });
		const radius = () => plane.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		expect(await radius()).toBe("999px");
		await mode(page, "sharp").click();
		expect(await radius()).toBe("2px");
	});
});
