import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("a new workspace gets started with sample documents, a chat question and the Playground", async ({
	page,
}) => {
	const email = uniqueEmail("onboarding");
	await signUpViaApi(email);
	await signIn(page, email);

	const steps = page.getByRole("list", { name: "Getting started steps" });
	await expect(page.getByRole("heading", { name: /Get started/ })).toBeVisible();
	await page.getByRole("button", { name: "Add sample documents" }).click();
	const documents = page.getByRole("main").getByRole("table");
	for (const title of ["Returns and refunds", "Shipping and delivery", "Product warranty"]) {
		// oxlint-disable-next-line no-await-in-loop -- each sample in the list
		await expect(documents.getByRole("link", { name: `Sample · ${title}` })).toBeVisible();
	}
	await expect(steps.getByText("Done")).toHaveCount(1);

	// Ask in Chat: the samples answer it.
	await steps.getByRole("link", { name: "Open Chat" }).click();
	await page
		.getByLabel("Message", { exact: true })
		.fill("How long do customers have to return an item?");
	await page.getByLabel("Message", { exact: true }).press("Enter");
	await expect(
		page.getByRole("list", { name: "Messages" }).getByRole("button", { name: "Copy" }),
	).toBeVisible();

	await page.getByRole("link", { name: "Documents", exact: true }).click();
	await expect(steps.getByText("Done")).toHaveCount(2);
	await page.getByRole("button", { name: "Hide Get started" }).click();
	await expect(page.getByRole("heading", { name: /Get started/ })).toHaveCount(0);
	await page.reload();
	await expect(page.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
	await expect(page.getByRole("heading", { name: /Get started/ })).toHaveCount(0);
});
