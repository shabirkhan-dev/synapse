import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });
const wrapper = (input: Locator) =>
	input.locator("xpath=ancestor::div[contains(@class,'rx-input-field')][1]");
const readStyles = (el: Element, props: string[]) =>
	props.map((prop) => getComputedStyle(el).getPropertyValue(prop));
const BLUE = "rgb(45, 124, 246)";
const RED = "rgb(229, 72, 77)";

test.describe("rabtx docs: input", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/input");
		await expect(page.getByRole("heading", { name: "Input", level: 1 })).toBeVisible();
	});

	test("the Field label names the input, the hint describes it and typing works", async ({
		page,
	}) => {
		const input = page.getByLabel("Email", { exact: true }).first();
		await expect(input).toHaveAccessibleDescription("We only use it to sign you in.");
		await input.fill("a@b.co");
		await expect(input).toHaveValue("a@b.co");
	});

	test("heights are 32, 40 and 48 and match the Select and Button in a row", async ({ page }) => {
		const sizes = { sm: 32, md: 40, lg: 48 };
		const fields = await Promise.all(
			Object.keys(sizes).map(
				async (size) =>
					(await wrapper(page.getByRole("textbox", { name: size, exact: true })).boundingBox())
						?.height,
			),
		);
		expect(fields).toEqual(Object.values(sizes));
		const rows = await page.locator("[data-row]").evaluateAll((elements) =>
			elements.map((row) =>
				[...row.children].map((child) => {
					const r = child.getBoundingClientRect();
					return [r.top, r.height];
				}),
			),
		);
		for (const [index, height] of Object.values(sizes).entries()) {
			const top = rows[index][0][0];
			expect(rows[index]).toEqual([
				[top, height],
				[top, height],
				[top, height],
			]);
		}
		// Same edge, fill and corners as the Select trigger.
		const props = ["border-top-color", "background-color", "border-top-left-radius"];
		const [input, select] = await Promise.all([
			wrapper(page.getByRole("textbox", { name: "Email, md" })).evaluate(readStyles, props),
			page.getByRole("combobox", { name: "Role, md" }).evaluate(readStyles, props),
		]);
		expect(input).toEqual(select);
	});

	test("clicking an icon focuses the input and shows the focus edge", async ({ page }) => {
		const input = page.getByRole("textbox", { name: "Work email" });
		await wrapper(input).locator(".rx-input-icon").click();
		await expect(input).toBeFocused();
		await expect(wrapper(input)).toHaveCSS("border-top-color", BLUE);
	});

	test("a Field error turns the edge red and shakes it; disabled and read-only hold", async ({
		page,
	}) => {
		const invalid = page.getByLabel("Username");
		await expect(invalid).toHaveAttribute("aria-invalid", "true");
		await expect(invalid).toHaveAccessibleDescription("That name is taken.");
		await expect(wrapper(invalid)).toHaveCSS("border-top-color", RED);
		await expect(wrapper(invalid)).toHaveCSS("animation-name", "rx-input-shake");
		await expect(page.getByRole("textbox", { name: "Workspace" })).toBeDisabled();
		await expect(page.getByRole("textbox", { name: "Invite link" })).not.toBeEditable();
	});

	test("a native constraint turns red only after editing (:user-invalid)", async ({ page }) => {
		const input = page.getByLabel("Backup email");
		await expect(wrapper(input)).not.toHaveCSS("border-top-color", RED);
		await input.fill("not-an-email");
		await input.blur();
		await expect(wrapper(input)).toHaveCSS("border-top-color", RED);
		await input.fill("ada@example.com");
		await input.blur();
		await expect(wrapper(input)).not.toHaveCSS("border-top-color", RED);
	});

	test("the clear button shows only with text and clears a controlled input", async ({ page }) => {
		const input = page.getByRole("searchbox", { name: "Search cities" });
		const clear = wrapper(input).getByRole("button", { name: "Clear" });
		await expect(clear).toBeVisible();
		await clear.click();
		await expect(input).toHaveValue("");
		await expect(input).toBeFocused();
		await expect(page.getByText("Query: (empty)")).toBeVisible();
		await expect(clear).toBeHidden();
		await input.pressSequentially("Lahore");
		await expect(clear).toBeVisible();
		await expect(page.getByText("Query: Lahore")).toBeVisible();
	});

	test("the eye shows and hides the password", async ({ page }) => {
		const input = page.getByLabel("Password", { exact: true });
		const eye = page.getByRole("button", { name: "Show password" });
		await expect(input).toHaveAttribute("type", "password");
		await expect(eye).toHaveAttribute("aria-pressed", "false");
		await eye.click();
		await expect(input).toHaveAttribute("type", "text");
		await expect(eye).toHaveAttribute("aria-pressed", "true");
		await eye.click();
		await expect(input).toHaveAttribute("type", "password");
	});

	test("a floating label names the input and floats up on focus", async ({ page }) => {
		const input = page.getByLabel("Full name");
		const label = page.locator("label.rx-input-label", { hasText: "Full name" });
		await expect(label).toHaveCSS("scale", "none");
		await input.focus();
		await expect(label).toHaveCSS("scale", "0.8");
		await expect(label).toHaveCSS("color", BLUE);
		await input.fill("Ada");
		await input.blur();
		await expect(label).toHaveCSS("scale", "0.8");
		// A filled one starts floated.
		await expect(page.locator("label.rx-input-label", { hasText: "Company" })).toHaveCSS(
			"scale",
			"0.8",
		);
	});

	test("the code input fills its slots, glides the ring and reports completion", async ({
		page,
	}) => {
		const input = page.getByLabel("Verification code");
		await expect(input).toHaveAttribute("autocomplete", "one-time-code");
		const root = input.locator("xpath=..");
		const ring = root.locator(".rx-otp-ring");
		await input.focus();
		await expect(ring).toHaveCSS("opacity", "1");
		const x0 = (await ring.boundingBox())?.x ?? 0;
		await page.keyboard.type("4a8");
		await expect(input).toHaveValue("48");
		await expect(root.locator(".rx-otp-slot[data-filled]")).toHaveCount(2);
		await expect(root).toHaveAttribute("style", "--_at: 2;");
		await expect.poll(async () => (await ring.boundingBox())?.x).toBeGreaterThan(x0);
		await page.keyboard.press("Backspace");
		await expect(input).toHaveValue("4");
		// A paste or an SMS autofill sets the whole code at once.
		await input.fill("123456");
		await expect(input).toHaveAccessibleDescription("Checking 123456…");
		await expect(root.locator(".rx-otp-slot[data-filled]")).toHaveCount(6);
	});

	test("Flat turns the filled variant into one border without moving it", async ({ page }) => {
		const filled = wrapper(page.getByRole("textbox", { name: "Filled" }));
		const before = await filled.boundingBox();
		await expect(filled).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
		await mode(page, "flat").click();
		await expect(filled).toHaveCSS("border-top-color", "rgb(227, 227, 227)");
		expect(await filled.boundingBox()).toEqual(before);
	});

	test("motion off drops the shake and the label float", async ({ page }) => {
		await mode(page, "off").click();
		await expect(wrapper(page.getByLabel("Username"))).toHaveCSS("animation-name", "none");
		await expect(page.locator("label.rx-input-label").first()).toHaveCSS(
			"transition-duration",
			/^0s/,
		);
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
