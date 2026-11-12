import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("add a document, ask about it, follow the citation, rate the answer", async ({ page }) => {
	const email = uniqueEmail("workspace");
	await signUpViaApi(email);
	await signIn(page, email);

	await page.getByRole("link", { name: "Playground", exact: true }).click();
	await page.getByLabel("Question").fill("How long do refunds take?");
	await page.getByRole("button", { name: "Ask" }).click();
	await expect(
		page.getByText("I could not find any ingested documents to answer from."),
	).toBeVisible();
	await page.getByRole("link", { name: "Add a document" }).click();

	await page.getByLabel("Title").fill("Refund policy");
	await page.getByLabel("Source (optional)").fill("https://example.com/refunds");
	await page
		.getByLabel("Text")
		.fill("Refunds are accepted within 30 days of purchase. Items must be unused.");
	await page.getByRole("button", { name: "Add document" }).click();
	await expect(page.getByRole("cell", { name: "Refund policy" })).toBeVisible();
	await expect(page.getByLabel("Title")).toHaveValue("");

	await page.getByRole("link", { name: "Playground", exact: true }).click();
	await page.getByLabel("Question").fill("How long do refunds take?");
	await page.getByLabel("Question").press("Control+Enter");
	const answer = page.getByRole("region", { name: "Answer" });
	await expect(answer.getByText(/Within 30 days/)).toBeVisible();

	await answer.getByRole("link", { name: "Source 1" }).click();
	await expect(page).toHaveURL(/#citation-1$/);
	await expect(page.locator("#citation-1")).toContainText("Refund policy");

	await answer.getByText("How this answer was made").click();
	await expect(answer.getByText("fake:openai/gpt-4o-mini")).toBeVisible();

	const feedback = page.waitForResponse((response) =>
		response.url().endsWith("/oversight/feedback"),
	);
	await page.getByRole("button", { name: "Yes" }).click();
	expect((await feedback).status()).toBe(200);
	await expect(page.getByText("Thanks, noted.")).toBeVisible();

	await expect(page.getByText("Retrieved passages")).toBeVisible();
	await expect(page.getByText(/keyword 1/)).toBeVisible();
});
