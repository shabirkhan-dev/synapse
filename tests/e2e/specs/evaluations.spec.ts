import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("a question with its document is run through every mode and scored", async ({ page }) => {
	const email = uniqueEmail("eval");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByRole("tab", { name: "Paste text" }).click();
	for (const [title, text] of [
		["Refund policy", "Refunds are accepted within 30 days of purchase."],
		["Shipping", "Orders ship within two business days."],
	] as const) {
		// oxlint-disable-next-line no-await-in-loop -- one document after the other
		await page.getByLabel("Title", { exact: true }).fill(title);
		// oxlint-disable-next-line no-await-in-loop
		await page.getByLabel("Text", { exact: true }).fill(text);
		// oxlint-disable-next-line no-await-in-loop
		await page.getByRole("button", { name: "Add document" }).click();
		// oxlint-disable-next-line no-await-in-loop
		await expect(page.getByRole("link", { name: title })).toBeVisible();
	}

	await page.getByRole("link", { name: "Evaluations" }).first().click();
	await expect(page.getByRole("heading", { level: 1, name: "Evaluations" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Run evaluation" })).toBeDisabled();

	await page.getByLabel("Question").fill("How many days do refunds take?");
	await page.getByRole("checkbox", { name: "Refund policy" }).click();
	await page.getByRole("button", { name: "Add question" }).click();
	const row = page.getByRole("row", { name: /How many days do refunds take/ });
	await expect(row.getByRole("cell", { name: "Refund policy" })).toBeVisible();
	await expect(page.getByRole("checkbox", { name: "Refund policy" })).not.toBeChecked();

	await page.getByRole("button", { name: "Top 3" }).click();
	await page.getByRole("button", { name: "Run evaluation" }).click();
	const scores = page.getByRole("table", { name: "Score per search mode" });
	await expect(scores.getByRole("row", { name: /Keywords/ })).toContainText("100%");
	await expect(scores.getByRole("columnheader", { name: "Found in top 3" })).toBeVisible();
	const ranks = page.getByRole("table", {
		name: "Rank of the first expected document for each question",
	});
	await expect(ranks.getByRole("row", { name: /How many days/ })).toContainText("#1");

	await page.reload();
	await expect(
		page
			.getByRole("table", { name: "Score per search mode" })
			.getByRole("row", { name: /Keywords/ }),
	).toContainText("100%");

	// Scoring answers: each question is answered and graded by the (fake) chat model.
	await page.getByText("Also score answers").click();
	await page.getByRole("button", { name: "Run evaluation" }).click();
	const quality = page.getByRole("region", { name: "Answer quality" });
	await expect(quality.getByText("Faithful to the passages")).toBeVisible();
	await expect(quality).toContainText("90%");
	await expect(quality).toContainText("answer-judge@1");
	await expect(
		page
			.getByRole("table", { name: "Rank of the first expected document for each question" })
			.getByRole("columnheader", { name: "Faithful" }),
	).toBeVisible();
});
