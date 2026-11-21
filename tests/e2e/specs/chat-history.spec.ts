import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

const QUESTION = "How long do customers have to ask for a refund?";

test("a conversation can be renamed; regenerated replies are versions; a stopped answer is kept", async ({
	page,
}) => {
	const email = uniqueEmail("history");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByRole("tab", { name: "Paste text" }).click();
	await page.getByLabel("Title", { exact: true }).fill("Refund policy");
	await page
		.getByLabel("Text", { exact: true })
		.fill("Refunds are accepted within 30 days of purchase.");
	await page.getByRole("button", { name: "Add document" }).click();
	await expect(page.getByRole("cell", { name: "Refund policy" })).toBeVisible();

	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await page.getByLabel("Message", { exact: true }).fill(QUESTION);
	await page.getByLabel("Message", { exact: true }).press("Enter");
	await expect(page).toHaveURL(/\/chat\?c=/);
	const messages = page.getByRole("list", { name: "Messages" });
	await expect(messages.getByRole("button", { name: "Regenerate" })).toBeVisible();

	// Rename from the heading; the list follows.
	await page.getByRole("button", { name: "Rename conversation" }).click();
	await page.getByLabel("Conversation name").fill("Refund questions");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Refund questions" })).toBeVisible();
	await expect(
		page.getByRole("navigation", { name: "Conversations" }).getByText("Refund questions"),
	).toBeVisible();

	// Regenerate keeps the first reply as version 1 of 2; going back to it survives a reload.
	await messages.getByRole("button", { name: "Regenerate" }).click();
	await expect(messages.getByText("Version 2 of 2")).toBeAttached();
	await messages.getByRole("button", { name: "Previous version" }).click();
	await expect(messages.getByText("Version 1 of 2")).toBeAttached();
	await page.reload();
	await expect(page.getByRole("heading", { level: 1, name: "Refund questions" })).toBeVisible();
	await expect(messages.getByText("Version 1 of 2")).toBeAttached();
	await expect(messages.getByRole("button", { name: "Copy" })).toHaveCount(1);

	// Stop an answer after its first words: what arrived is kept.
	await page.getByLabel("Message", { exact: true }).fill("And for sale items?");
	await page.getByLabel("Message", { exact: true }).press("Enter");
	const reply = messages.getByRole("listitem").last();
	await expect(reply.getByText(/Refunds are/)).toBeVisible();
	await page.getByRole("button", { name: "Stop" }).click();
	await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(0);
	await page.reload();
	await expect(messages.getByText("And for sale items?", { exact: true })).toBeVisible();
	await expect(messages.getByRole("button", { name: "Copy" })).toHaveCount(2);
	await expect(messages.getByRole("listitem").last()).toContainText("Refunds are");
});
