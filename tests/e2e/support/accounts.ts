import { expect, type Page } from "@playwright/test";

import { E2E, PASSWORD } from "./env";

/** A documentation-range address (RFC 5737), different for every call. */
function clientIp(): string {
	return `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
}

/**
 * Create an account straight through the API (faster than the form when sign-up is not the
 * subject), from its own client IP so suite size never runs into the per-IP sign-up limit.
 */
export async function signUpViaApi(email: string, password = PASSWORD): Promise<void> {
	const response = await fetch(`${E2E.apiUrl}/auth/sign-up`, {
		method: "POST",
		headers: { "content-type": "application/json", "x-forwarded-for": clientIp() },
		body: JSON.stringify({ email, password }),
	});
	expect(response.status, await response.text()).toBe(201);
}

/** Sign in through the console's form and wait for the workspace. */
export async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
	await page.goto("/sign-in");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.waitForURL("**/documents");
}
