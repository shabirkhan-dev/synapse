import { expect, test } from "@playwright/test";

import { signUpViaApi } from "../support/accounts";
import { PASSWORD, uniqueEmail } from "../support/env";
import { totpCode } from "../support/totp";

test("two-step sign-in: turned on from the Account page, then asked for at the next sign-in", async ({
	page,
}) => {
	const email = uniqueEmail("twostep");
	await signUpViaApi(email);
	await page.goto("/sign-in");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.waitForURL("**/documents");

	await page.goto("/account");
	await page.getByRole("button", { name: "Set up two-step sign-in" }).click();
	await expect(page.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible();
	const key = (await page.locator("code", { hasText: /^[A-Z2-7 ]{20,}$/ }).textContent()) ?? "";
	const secret = key.replace(/\s/g, "");
	await page.getByLabel("Code from the app").fill(totpCode(secret));
	await page.getByRole("button", { name: "Turn on" }).click();
	await expect(
		page.getByText("Save these recovery codes now: they are not shown again"),
	).toBeVisible();
	await expect(
		page.getByRole("list", { name: "Recovery codes" }).getByRole("listitem"),
	).toHaveCount(10);
	await page.getByRole("button", { name: "I saved them" }).click();
	await expect(page.getByText("10 recovery codes left.", { exact: false })).toBeVisible();

	await page.getByRole("button", { name: "Account menu" }).click();
	await page.getByRole("menuitem", { name: "Sign out" }).click();
	await page.waitForURL("**/sign-in");

	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.getByRole("heading", { name: "Two-step sign-in" })).toBeVisible();
	// The code used to turn it on cannot be used again: the next one can.
	await page.getByLabel("Authentication code").fill(totpCode(secret, 1));
	await page.getByRole("button", { name: "Continue" }).click();
	await page.waitForURL("**/documents");
});
