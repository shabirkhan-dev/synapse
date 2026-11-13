import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("one query runs through hybrid, meaning and keyword search side by side", async ({ page }) => {
	const email = uniqueEmail("retrieval");
	await signUpViaApi(email);
	await signIn(page, email);
	for (const { title, text } of [
		{ title: "Refund policy", text: "Refunds are accepted within 30 days of purchase." },
		{ title: "Shipping policy", text: "Orders ship within two business days." },
	]) {
		// oxlint-disable-next-line no-await-in-loop
		await page.getByLabel("Title", { exact: true }).fill(title);
		// oxlint-disable-next-line no-await-in-loop
		await page.getByLabel("Text").fill(text);
		// oxlint-disable-next-line no-await-in-loop
		await page.getByRole("button", { name: "Add document" }).click();
		// oxlint-disable-next-line no-await-in-loop
		await expect(page.getByRole("cell", { name: title })).toBeVisible();
	}

	await page.getByRole("link", { name: "Retrieval", exact: true }).click();
	await page.getByLabel("Search for").fill("refunds purchase");
	await page.getByRole("button", { name: "Compare" }).click();

	const keywords = page.getByRole("region", { name: "Keywords" });
	await expect(keywords.getByRole("link", { name: "Refund policy" })).toBeVisible();
	await expect(keywords.getByRole("link", { name: "Shipping policy" })).toHaveCount(0);
	const hybrid = page.getByRole("region", { name: "Hybrid" });
	const first = hybrid.getByRole("listitem").first();
	await expect(first).toContainText("Refund policy");
	await expect(first).toContainText("Fused (RRF) score");
	await expect(first).toContainText(/also #\d in Meaning, #1 in Keywords/);
	await expect(
		page
			.getByRole("region", { name: "Meaning" })
			.getByText(/Cosine similarity/)
			.first(),
	).toBeVisible();

	await keywords.getByRole("link", { name: "Refund policy" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Refund policy" })).toBeVisible();
});
