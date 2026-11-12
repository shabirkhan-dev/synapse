import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("an answered question shows up in usage with its tokens and the models behind it", async ({
	page,
}) => {
	const email = uniqueEmail("usage");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByRole("link", { name: "Usage", exact: true }).click();
	await expect(page.getByText(/No answers in the last 30 days/)).toBeVisible();

	await page.getByRole("link", { name: "Documents", exact: true }).click();
	await page.getByLabel("Title").fill("Refund policy");
	await page.getByLabel("Text").fill("Refunds are accepted within 30 days of purchase.");
	await page.getByRole("button", { name: "Add document" }).click();
	await expect(page.getByRole("cell", { name: "Refund policy" })).toBeVisible();
	await page.getByRole("link", { name: "Playground", exact: true }).click();
	await page.getByLabel("Question").fill("How long do refunds take?");
	await page.getByLabel("Question").press("Control+Enter");
	await expect(
		page.getByRole("region", { name: "Answer" }).getByText(/Within 30 days/),
	).toBeVisible();

	await page.getByRole("link", { name: "Usage", exact: true }).click();
	await expect(page.getByText(/Every answer in this organization/)).toBeVisible();
	const answers = page.getByRole("definition").first();
	await expect(answers).toHaveText("1");
	await expect(page.getByRole("figure")).toContainText("Busiest:");
	const model = page.getByRole("row").filter({ hasText: "fake:openai/gpt-4o-mini" });
	await expect(model).toContainText(/rag-answer@\d/);
	await expect(page.getByText("No prices set (AI_MODEL_PRICES)")).toBeVisible();

	await page.getByRole("button", { name: "Last 7 days" }).click();
	await expect(page.getByRole("button", { name: "Last 7 days" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await expect(answers).toHaveText("1");
});
