import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("an owner sees the database, circuits, jobs, index and traces on System", async ({ page }) => {
	const email = uniqueEmail("system");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByLabel("Title", { exact: true }).fill("Refund policy");
	await page.getByLabel("Text").fill("Refunds are accepted within 30 days.");
	await page.getByRole("button", { name: "Add document" }).click();
	await expect(page.getByRole("link", { name: "Refund policy" })).toBeVisible();

	await page.getByRole("link", { name: "System", exact: true }).click();
	await expect(page.getByRole("heading", { level: 1, name: "System" })).toBeVisible();
	await expect(page.getByText("Reachable")).toBeVisible();
	await expect(page.getByText("All working")).toBeVisible();
	const chat = page.getByRole("row").filter({ hasText: "Chat model" });
	await expect(chat.getByText("Working")).toBeVisible();
	await expect(
		page.getByText(/Every chunk in this workspace uses the current embedding model/),
	).toBeVisible();
	await expect(page.getByText(/Not exported/)).toBeVisible();
});
