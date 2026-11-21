import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { E2E, uniqueEmail } from "../support/env";

const listDocuments = (key: string) =>
	fetch(`${E2E.apiUrl}/rag/documents`, { headers: { authorization: `Bearer ${key}` } });

test("an API key is created on the Account page, used from a script, and revoked", async ({
	page,
}) => {
	const email = uniqueEmail("keys");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.goto("/account");
	await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();

	await page.getByLabel("New key's name").fill("Nightly import");
	await page.getByRole("button", { name: "Create a key for Personal" }).click();
	await expect(page.getByText("Copy “Nightly import” now: it is not shown again")).toBeVisible();
	const key = (await page.locator("code", { hasText: /^syn_/ }).first().textContent()) ?? "";
	expect(key).toMatch(/^syn_[A-Za-z0-9_-]{20,}$/);

	// A script with the key reads the API as this user.
	expect((await listDocuments(key)).status).toBe(200);

	await page.getByRole("button", { name: "Done" }).click();
	await expect(page.getByText(key)).toHaveCount(0);
	await page.getByRole("button", { name: "Revoke the key “Nightly import”" }).click();
	await expect(page.getByText("No keys yet.")).toBeVisible();
	expect((await listDocuments(key)).status).toBe(401);
});
