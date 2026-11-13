import { expect, test } from "@playwright/test";

import { signUpViaApi } from "../support/accounts";
import { E2E, NEW_PASSWORD, PASSWORD, uniqueEmail } from "../support/env";
import { emailedToken } from "../support/mail";

const refreshCookie = async (context: import("@playwright/test").BrowserContext) =>
	(await context.cookies(`${E2E.apiUrl}/auth/refresh`)).find(
		(cookie) => cookie.name === "synapse_refresh",
	);

test("signed-out visitors are sent to sign-in", async ({ page }) => {
	await page.goto("/documents");
	await expect(page).toHaveURL(/\/sign-in$/);
	await page.goto("/playground");
	await expect(page).toHaveURL(/\/sign-in$/);
});

test("sign up, keep the session in an httpOnly cookie, verify the email, sign out", async ({
	page,
	context,
}) => {
	const email = uniqueEmail("signup");
	await page.goto("/sign-in");
	await page.getByRole("link", { name: "Create an account" }).click();
	// Both pages have an "Email" field: wait for the new page before typing.
	await expect(page.getByRole("heading", { name: "Create your Synapse account" })).toBeVisible();
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password", { exact: true }).fill("short");
	await page.getByLabel("Repeat the password").fill("short");
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page.getByText("Use at least 12 characters")).toBeVisible();

	await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
	await page.getByLabel("Repeat the password").fill(PASSWORD);
	await page.getByRole("button", { name: "Create account" }).click();
	await expect(page).toHaveURL(/\/documents$/);
	await expect(page.getByText("No documents yet")).toBeVisible();

	// ADR-0007: the refresh token lives only in the httpOnly cookie, never in page-readable storage.
	const cookie = await refreshCookie(context);
	expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Strict", path: "/api/v1/auth" });
	const readable = await page.evaluate(
		() => JSON.stringify({ ...sessionStorage, ...localStorage }) + document.cookie,
	);
	expect(readable).not.toContain(cookie?.value ?? "missing");

	await page.reload();
	await expect(page.getByText("No documents yet")).toBeVisible();

	const token = await emailedToken(email, "/verify-email");
	await page.goto(`/verify-email?token=${token}`);
	await expect(page.getByText("Email verified")).toBeVisible();
	await expect(page).toHaveURL(/\/verify-email$/);

	await page.goto("/documents");
	await page.getByRole("button", { name: "Sign out" }).click();
	await expect(page).toHaveURL(/\/sign-in$/);
	expect(await refreshCookie(context)).toBeUndefined();
	await page.goto("/documents");
	await expect(page).toHaveURL(/\/sign-in$/);
});

test("two tabs reloading at once keep the session (no refresh-token reuse)", async ({
	page,
	context,
}) => {
	const email = uniqueEmail("tabs");
	await signUpViaApi(email);
	await page.goto("/sign-in");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/documents$/);

	const other = await context.newPage();
	await other.goto("/documents");
	// Sequential rounds on purpose: each starts from the cookie the previous round rotated.
	for (let round = 0; round < 3; round++) {
		// oxlint-disable-next-line no-await-in-loop
		await Promise.all([page.reload(), other.reload()]).then(() =>
			Promise.all([
				expect(page.getByText("No documents yet")).toBeVisible(),
				expect(other.getByText("No documents yet")).toBeVisible(),
			]),
		);
	}
});

test("forgot password: emailed link, new password, old one refused, link single-use", async ({
	page,
}) => {
	const email = uniqueEmail("reset");
	await signUpViaApi(email);

	await page.goto("/sign-in");
	await page.getByRole("link", { name: "Forgot your password?" }).click();
	await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
	await page.getByLabel("Email").fill(email);
	await page.getByRole("button", { name: "Send reset link" }).click();
	await expect(page.getByText(/If that address has an account/)).toBeVisible();

	const token = await emailedToken(email, "/reset-password");
	await page.goto(`/reset-password?token=${token}`);
	await expect(page).toHaveURL(/\/reset-password$/);
	await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
	await page.getByLabel("Repeat the new password").fill(NEW_PASSWORD);
	await page.getByRole("button", { name: "Save new password" }).click();
	await expect(page.getByText("Password changed")).toBeVisible();

	await page.goto(`/reset-password?token=${token}`);
	await page.getByLabel("New password", { exact: true }).fill(`${NEW_PASSWORD}-2`);
	await page.getByLabel("Repeat the new password").fill(`${NEW_PASSWORD}-2`);
	await page.getByRole("button", { name: "Save new password" }).click();
	await expect(page.getByText(/invalid, expired or already used/)).toBeVisible();

	await page.goto("/sign-in");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.getByText("Email or password is incorrect")).toBeVisible();
	await page.getByLabel("Password").fill(NEW_PASSWORD);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/documents$/);
});
