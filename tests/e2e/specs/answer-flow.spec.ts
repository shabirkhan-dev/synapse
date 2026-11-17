import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("Ctrl+K jumps anywhere; answers offer follow-ups, copy and a fresh answer", async ({
	page,
	context,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	const email = uniqueEmail("flow");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByLabel("Title", { exact: true }).fill("Refund policy");
	await page.getByLabel("Text").fill("Refunds are accepted within 30 days of purchase.");
	await page.getByRole("button", { name: "Add document" }).click();
	await expect(page.getByRole("cell", { name: "Refund policy" })).toBeVisible();

	// The palette: pages and documents by name, keyboard only.
	await page.keyboard.press("Control+k");
	const palette = page.getByRole("dialog", { name: "Search Synapse" });
	await expect(palette).toBeVisible();
	await page.keyboard.type("playgr");
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(/\/playground$/);
	await expect(page.getByRole("heading", { level: 1, name: "Playground" })).toBeVisible();

	await page.getByLabel("Question").fill("How long do refunds take?");
	await page.getByRole("button", { name: "Ask", exact: true }).click();
	const answer = page.getByRole("region", { name: "Answer" });
	await expect(answer.getByText(/Within 30 days/)).toBeVisible();
	await answer.getByRole("button", { name: "Copy answer" }).click();
	await expect(answer.getByText("Copied")).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Within 30 days");

	// A suggested next question is asked with one click.
	await answer.getByRole("button", { name: /Who pays the return shipping\?/ }).click();
	await expect(answer.getByText("Who pays the return shipping?", { exact: true })).toBeVisible();

	// Chat: regenerate replaces the reply, in the stored conversation too.
	await page.getByRole("button", { name: "Search" }).click();
	await page.keyboard.type("new chat");
	await page.keyboard.press("Enter");
	await expect(page.getByRole("heading", { name: "New chat" })).toBeVisible();
	await page
		.getByLabel("Message", { exact: true })
		.fill("How long do customers have to ask for a refund?");
	await page.getByLabel("Message", { exact: true }).press("Enter");
	const messages = page.getByRole("list", { name: "Messages" });
	await expect(page).toHaveURL(/\/chat\?c=/);
	const regenerate = messages.getByRole("button", { name: "Regenerate" });
	await expect(regenerate).toBeVisible();
	await regenerate.click();
	await expect(messages.getByRole("button", { name: "Regenerate" })).toBeVisible();
	await expect(page.getByRole("button", { name: /Can I return a used item\?/ })).toBeVisible();
	await page.reload();
	await expect(
		messages.getByText("How long do customers have to ask for a refund?", { exact: true }),
	).toHaveCount(1);
	await expect(messages.getByRole("button", { name: "Copy" })).toHaveCount(1);
});
