import { expect, type Locator, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("header label", { hasText: new RegExp(`^${name}$`, "i") });
const signup = (page: Page) =>
	page.locator("section.rx-signup").filter({ hasText: "Create your account" });
const signin = (page: Page) =>
	page.locator("section.rx-signup").filter({ hasText: "Welcome back" });
const field = (card: Locator, label: string) => card.getByLabel(label, { exact: true });
const steps = (card: Locator) =>
	card
		.getByRole("list", { name: "Sign-up progress" })
		.getByRole("listitem")
		.evaluateAll((items) => items.map((item) => item.getAttribute("data-state")));
const live = (card: Locator) => card.locator("p.sr-only[aria-live]");

async function fillAccount(card: Locator, email = "ada@example.com") {
	await field(card, "Full name").fill("Ada Lovelace");
	await field(card, "Email").fill(email);
	await field(card, "Password").fill("Analytical Engine 1843");
	await field(card, "Role").selectOption("engineer");
	await field(card, "Country").selectOption("pk");
	await card.getByRole("checkbox", { name: /I agree to the Terms/ }).check();
}

test.describe("rabtx docs: sign-up block", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/blocks/signup");
		await expect(page.getByRole("heading", { name: "Sign-up block", level: 1 })).toBeVisible();
	});

	test("it is a card with three steps, the first current, made of the Rabtx controls", async ({
		page,
	}) => {
		const card = signup(page);
		await expect(card).toHaveAttribute("data-slot", "card");
		expect(await steps(card)).toEqual(["current", "upcoming", "upcoming"]);
		await expect(card.getByRole("listitem").first()).toHaveAttribute("aria-current", "step");
		await expect(card.getByRole("group", { name: "Your details" })).toBeVisible();
		await expect(field(card, "Email")).toHaveAttribute("type", "email");
		await expect(card.getByRole("switch", { name: "Email me product updates" })).not.toBeChecked();
		await expect(card.getByRole("button", { name: "Show password" })).toBeVisible();
	});

	test("Continue with nothing filled shows every error, focuses the first and clears each once fixed", async ({
		page,
	}) => {
		const card = signup(page);
		await card.getByRole("button", { name: "Continue" }).click();
		await expect(field(card, "Full name")).toBeFocused();
		await expect(field(card, "Full name")).toHaveAccessibleDescription("Enter your name.");
		await expect(field(card, "Full name")).toHaveAttribute("aria-invalid", "true");
		await expect(field(card, "Email")).toHaveAccessibleDescription("Enter your email address.");
		await expect(field(card, "Password")).toHaveAccessibleDescription("Choose a password.");
		await expect(field(card, "Role")).toHaveAccessibleDescription(
			"Choose the role closest to yours.",
		);
		await expect(field(card, "Country")).toHaveAccessibleDescription("Choose your country.");
		const terms = card.getByRole("checkbox", { name: /I agree to the Terms/ });
		await expect(terms).toHaveAccessibleDescription("Accept the terms to continue.");
		await expect(terms).toHaveAttribute("aria-invalid", "true");
		// The edge turns red, as for any invalid Input.
		await expect(field(card, "Email").locator("xpath=..")).toHaveCSS(
			"border-top-color",
			"rgb(229, 72, 77)",
		);
		// Still on step 1.
		expect(await steps(card)).toEqual(["current", "upcoming", "upcoming"]);

		await field(card, "Full name").fill("Ada");
		await expect(field(card, "Full name")).not.toHaveAttribute("aria-invalid");
		await terms.check();
		await expect(card.getByText("Accept the terms to continue.")).toHaveCount(0);
	});

	test("a filled field is checked when focus leaves it, with the native constraints", async ({
		page,
	}) => {
		const card = signup(page);
		await field(card, "Email").fill("ada@example");
		await field(card, "Email").press("Tab");
		await expect(field(card, "Email")).toHaveAccessibleDescription(
			"Enter an email address like name@example.com.",
		);
		expect(
			await field(card, "Email").evaluate((input: HTMLInputElement) => input.matches(":invalid")),
		).toBe(true);
		await field(card, "Email").fill("ada@example.com");
		await expect(field(card, "Email")).not.toHaveAttribute("aria-invalid");

		const password = field(card, "Password");
		await password.fill("short");
		await expect(password).toHaveAccessibleDescription("Strength: Weak");
		await password.press("Tab");
		await expect(password).toHaveAccessibleDescription("Use at least 8 characters.");
		await password.fill("Analytical Engine 1843");
		await expect(password).toHaveAccessibleDescription("Strength: Strong");
		await expect(card.locator(".rx-signup-strength")).toHaveAttribute("data-score", "4");
	});

	test("an onSubmit field error stays on the step and focuses the field", async ({ page }) => {
		const card = signup(page);
		await fillAccount(card, "taken@example.com");
		await card.getByRole("button", { name: "Continue" }).click();
		await expect(field(card, "Email")).toHaveAccessibleDescription(
			"That email already has an account. Sign in instead.",
		);
		await expect(field(card, "Email")).toBeFocused();
		expect(await steps(card)).toEqual(["current", "upcoming", "upcoming"]);
	});

	test("the whole flow by keyboard: details, a wrong code, the right code, done", async ({
		page,
	}) => {
		const card = signup(page);
		await field(card, "Full name").focus();
		await page.keyboard.type("Ada Lovelace");
		await page.keyboard.press("Tab");
		await page.keyboard.type("ada@example.com");
		await page.keyboard.press("Tab");
		await page.keyboard.type("Analytical Engine 1843");
		await page.keyboard.press("Tab"); // the eye button
		await page.keyboard.press("Tab");
		await expect(field(card, "Role")).toBeFocused();
		await field(card, "Role").selectOption("designer");
		await page.keyboard.press("Tab");
		await field(card, "Country").selectOption("gb");
		await page.keyboard.press("Tab");
		await expect(card.getByRole("checkbox", { name: /I agree/ })).toBeFocused();
		await page.keyboard.press("Space");
		await page.keyboard.press("Tab");
		await expect(card.getByRole("switch")).toBeFocused();
		await page.keyboard.press("Space");
		await expect(card.getByRole("switch")).toBeChecked();
		await page.keyboard.press("Tab");
		await expect(card.getByRole("button", { name: "Continue" })).toBeFocused();
		await page.keyboard.press("Enter");

		// Loading, then step 2 with its heading focused and announced.
		await expect(card.getByRole("button", { name: /Creating account/ })).toHaveAttribute(
			"aria-busy",
			"true",
		);
		const verify = card.getByRole("heading", { name: "Check your email" });
		await expect(verify).toBeFocused();
		await expect(live(card)).toHaveText("Step 2 of 3: Check your email");
		expect(await steps(card)).toEqual(["complete", "current", "upcoming"]);
		await expect(card.getByText("ada@example.com", { exact: true })).toBeVisible();
		await expect(card.getByRole("button", { name: /Resend code in 0:\d\d/ })).toBeDisabled();
		// The leaving step is gone after its exit, so step 1's fields are no longer in the form.
		await expect(field(card, "Full name")).toHaveCount(0);

		// A wrong code: filling the last digit submits it; it is rejected, cleared and refocused.
		const code = card.getByRole("textbox", { name: "Verification code" });
		await page.keyboard.press("Tab");
		await expect(code).toBeFocused();
		await page.keyboard.type("000000");
		await expect(code).toHaveAccessibleDescription(
			"That code is not right. Check the email and try again.",
		);
		await expect(code).toHaveValue("");
		await expect(code).toBeFocused();

		// Enter with part of a code asks for all of it.
		await page.keyboard.type("12");
		await page.keyboard.press("Enter");
		await expect(code).toHaveAccessibleDescription("Enter all 6 digits.");

		await page.keyboard.type("3456");
		const done = card.getByRole("heading", { name: "You're all set" });
		await expect(done).toBeFocused({ timeout: 10_000 });
		await expect(live(card)).toHaveText("Step 3 of 3: You're all set");
		expect(await steps(card)).toEqual(["complete", "complete", "complete"]);
		await expect(card.getByText("Welcome, Ada.")).toBeVisible();
		await expect(card.locator(".rx-signup-done-mark")).toBeVisible();

		// Start over (no onFinish in this example).
		await card.getByRole("button", { name: "Start over" }).click();
		await expect(card.getByRole("heading", { name: "Your details" })).toBeFocused();
		await expect(field(card, "Full name")).toHaveValue("");
	});

	test("Back returns to step 1 with everything still typed", async ({ page }) => {
		const card = signup(page);
		await fillAccount(card);
		await card.getByRole("button", { name: "Continue" }).click();
		await expect(card.getByRole("heading", { name: "Check your email" })).toBeFocused();
		await card.getByRole("button", { name: "Back" }).click();
		await expect(card.getByRole("heading", { name: "Your details" })).toBeFocused();
		await expect(live(card)).toHaveText("Step 1 of 3: Your details");
		await expect(field(card, "Full name")).toHaveValue("Ada Lovelace");
		await expect(field(card, "Email")).toHaveValue("ada@example.com");
		await expect(field(card, "Role")).toHaveValue("engineer");
		await expect(card.getByRole("checkbox", { name: /I agree/ })).toBeChecked();
	});

	test("steps slide: the old step leaves while the new one enters, and the card eases its height", async ({
		page,
	}) => {
		// Hold the clock so the leaving step (removed after 240ms) can be inspected.
		await page.clock.install();
		await page.goto("/ui/blocks/signup");
		const card = signup(page);
		await expect(card).not.toHaveAttribute("data-moved");
		await fillAccount(card);
		await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
		await card.getByRole("button", { name: "Continue" }).click();
		await page.clock.runFor(1000);
		const leaving = card.locator("[data-leaving]");
		await expect(leaving).toHaveCount(1);
		await expect(leaving).toHaveAttribute("data-step", "account");
		await expect(leaving).toHaveAttribute("inert", "");
		await expect(leaving).toHaveCSS("animation-name", "rx-signup-leave");
		await expect(leaving.locator("input[name=name]")).toBeDisabled();
		await expect(card).toHaveAttribute("data-moved", "");
		const entering = card.locator("[data-current]");
		await expect(entering).toHaveAttribute("data-step", "verify");
		await expect(entering).toHaveCSS("transition-property", /translate/);
		await expect(card.locator(".rx-signup-viewport")).toHaveCSS("transition-property", "height");
		await page.clock.runFor(300);
		await expect(leaving).toHaveCount(0);
	});

	test("Motion off switches steps at once", async ({ page }) => {
		await mode(page, "off").click();
		const card = signup(page);
		await fillAccount(card);
		await card.getByRole("button", { name: "Continue" }).click();
		await expect(card.getByRole("heading", { name: "Check your email" })).toBeFocused();
		const leaving = card.locator("[data-leaving]");
		if ((await leaving.count()) > 0) await expect(leaving).toBeHidden();
		await expect(card.locator("[data-current]")).toHaveCSS("transition-duration", "0s");
		await expect(card.locator(".rx-signup-viewport")).toHaveCSS("transition-duration", "0s");
	});

	test("the resend button unlocks after the countdown and sends a new code", async ({ page }) => {
		await page.clock.install();
		await page.goto("/ui/blocks/signup");
		const card = signup(page);
		await fillAccount(card);
		await card.getByRole("button", { name: "Continue" }).click();
		await page.clock.runFor(1000);
		const resend = card.getByRole("button", { name: /Resend code/ });
		await expect(resend).toHaveText("Resend code in 0:30");
		await expect(resend).toBeDisabled();
		// One second at a time: each tick renders and schedules the next before the clock moves on.
		const tick = async (left: number) => {
			await page.clock.runFor(1000);
			await expect(resend).not.toHaveText(`Resend code in 0:${String(left).padStart(2, "0")}`);
		};
		for (let left = 30; left > 0; left--) {
			// oxlint-disable-next-line no-await-in-loop
			await tick(left);
		}
		await expect(resend).toHaveText("Resend code");
		await expect(resend).toBeEnabled();
		await resend.click();
		await page.clock.runFor(1000);
		await expect(live(card)).toHaveText("We sent a new code to ada@example.com.");
		await expect(resend).toBeDisabled();
	});

	test("in dark mode the block follows the theme", async ({ page }) => {
		await mode(page, "dark").click();
		const card = signup(page);
		await expect(card).toHaveCSS("color", "rgb(235, 235, 235)");
	});
});

test.describe("rabtx docs: sign-in block", () => {
	test("social buttons, remember me, and a thrown error shown as an alert", async ({ page }) => {
		await page.goto("/ui/blocks/signup");
		const card = signin(page);
		await expect(card.getByRole("button", { name: "Google" })).toBeVisible();
		await expect(card.getByRole("button", { name: "GitHub" })).toBeVisible();
		await card.getByRole("button", { name: "Sign in" }).click();
		await expect(field(card, "Email")).toBeFocused();
		await expect(field(card, "Email")).toHaveAccessibleDescription("Enter your email address.");
		await field(card, "Email").fill("ada@example.com");
		await field(card, "Password").fill("wrong");
		await card.getByRole("checkbox", { name: "Remember me" }).check();
		await field(card, "Password").press("Enter");
		await expect(card.getByRole("alert")).toHaveText("Wrong email or password.");
		await field(card, "Password").fill("correct horse");
		await card.getByRole("button", { name: /Sign in|Try again/ }).click();
		await expect(card.getByRole("button", { name: /Signed in/ })).toBeVisible();
	});
});
