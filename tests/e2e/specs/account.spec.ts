import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";
import { emailedToken } from "../support/mail";

test("account: resend the verification link, then sign out another device from this one", async ({
	browser,
}) => {
	const email = uniqueEmail("account");
	await signUpViaApi(email);
	const firstLink = await emailedToken(email, "/verify-email");
	const laptop = await (await browser.newContext()).newPage();
	const phone = await (
		await browser.newContext({
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Version/18.1 Mobile/15E148 Safari/604.1",
		})
	).newPage();

	// Unverified: every workspace page says so and leads to the account page.
	await signIn(laptop, email);
	await expect(laptop.getByText("Verify your email")).toBeVisible();
	await laptop.getByRole("link", { name: "Send a new link from your account" }).click();
	await expect(laptop.getByRole("heading", { name: "Account" })).toBeVisible();
	await expect(laptop.getByText("Not verified")).toBeVisible();
	await laptop.getByRole("button", { name: "Send a new link" }).click();
	await expect(laptop.getByText(`Sent. Check ${email} for the new link.`)).toBeVisible();

	// The new link (not the sign-up one) verifies the email; the notice goes away.
	await expect.poll(() => emailedToken(email, "/verify-email")).not.toBe(firstLink);
	await laptop.goto(`/verify-email?token=${await emailedToken(email, "/verify-email")}`);
	await expect(laptop.getByText("Email verified")).toBeVisible();
	await laptop.goto("/account");
	await expect(laptop.getByText("Verified", { exact: true })).toBeVisible();
	await expect(laptop.getByText("Verify your email")).toHaveCount(0);

	// Three sessions (the API sign-up, this laptop, the phone): this one is marked.
	await signIn(phone, email);
	await laptop.reload();
	const devices = laptop.getByRole("main").getByRole("listitem");
	await expect(devices).toHaveCount(3);
	await expect(devices.filter({ hasText: "This device" })).toHaveCount(1);
	await expect(devices.filter({ hasText: "Safari on iOS" })).toBeVisible();
	await laptop.getByRole("button", { name: "Sign out everywhere else" }).click();
	const dialog = laptop.getByRole("alertdialog");
	await expect(dialog.getByText("Sign out 2 other devices?")).toBeVisible();
	await dialog.getByRole("button", { name: "Sign out 2 other devices" }).click();
	await expect(dialog).toBeHidden();
	await expect(laptop.getByText("Signed out 2 other devices.")).toBeVisible();
	await expect(devices).toHaveCount(1);

	// The phone's session is gone: on its next load it is sent to sign-in.
	await phone.reload();
	await expect(phone).toHaveURL(/\/sign-in$/);
	// The laptop is still signed in.
	await laptop.reload();
	await expect(laptop.getByRole("heading", { name: "Account" })).toBeVisible();
});
