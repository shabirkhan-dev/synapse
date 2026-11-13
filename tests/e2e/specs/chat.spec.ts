import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

const QUESTION = "How long do customers have to ask for a refund?";
const ANSWER = "Refunds are accepted within 30 days of purchase.";

test("chat streams an answer that searched the documents; the conversation is kept, reopened and deleted", async ({
	page,
}) => {
	const email = uniqueEmail("chat");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByLabel("Title", { exact: true }).fill("Refund policy");
	await page.getByLabel("Text").fill("Refunds are accepted within 30 days of purchase.");
	await page.getByRole("button", { name: "Add document" }).click();
	await expect(page.getByRole("cell", { name: "Refund policy" })).toBeVisible();

	await page.getByRole("link", { name: "Chat", exact: true }).click();
	await expect(page.getByRole("heading", { name: "New chat" })).toBeVisible();
	await expect(page.getByText("Ask about your documents")).toBeVisible();

	// Enter sends; Stop is offered while the answer streams.
	await page.getByLabel("Message", { exact: true }).fill(QUESTION);
	await page.getByLabel("Message", { exact: true }).press("Enter");
	const messages = page.getByRole("list", { name: "Messages" });
	await expect(messages.getByText(QUESTION, { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
	await expect(messages.getByText(ANSWER)).toBeVisible();
	await expect(messages.getByText(`Searched your documents for “${QUESTION}”`)).toBeVisible();
	await messages.getByText("Show sources").click();
	await expect(messages.getByRole("listitem").filter({ hasText: /^Refund policy$/ })).toBeVisible();
	await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
	await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");

	// The conversation is stored: its address survives a reload and it is listed.
	await expect(page).toHaveURL(/\/chat\?c=[0-9a-f-]{36}$/);
	const conversations = page.getByRole("navigation", { name: "Conversations" });
	await expect(
		conversations.getByRole("link", { name: new RegExp(QUESTION.slice(0, 20)) }),
	).toBeVisible();
	await page.reload();
	await expect(messages.getByText(QUESTION, { exact: true })).toBeVisible();
	await expect(messages.getByText(ANSWER)).toBeVisible();

	// A new chat starts empty; the stored one opens again from the list.
	await conversations.getByRole("link", { name: "New chat" }).click();
	await expect(page.getByText("Ask about your documents")).toBeVisible();
	await conversations.getByRole("link", { name: new RegExp(QUESTION.slice(0, 20)) }).click();
	await expect(messages.getByText(ANSWER)).toBeVisible();

	// Deleting asks first, then removes it from the list.
	await conversations.getByRole("button", { name: /^Delete conversation/ }).click();
	const dialog = page.getByRole("alertdialog");
	await expect(dialog.getByText("This cannot be undone.", { exact: false })).toBeVisible();
	await dialog.getByRole("button", { name: "Delete conversation" }).click();
	await expect(dialog).toBeHidden();
	await expect(conversations.getByText("Your conversations appear here.")).toBeVisible();
	await expect(page.getByRole("heading", { name: "New chat" })).toBeVisible();

	// The chat reply is recorded like any answer: it shows in Usage with its prompt version.
	await page.getByRole("link", { name: "Usage", exact: true }).click();
	const chatRow = page.getByRole("row").filter({ hasText: /^Chat/ });
	await expect(chatRow).toContainText(/chat-assistant@\d/);
	await expect(chatRow).toContainText("fake:openai/gpt-4o-mini");

	// Agents lists the same reply as a run of the chat assistant, with the tool it called.
	await page.getByRole("link", { name: "Agents", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Chat assistant" })).toBeVisible();
	const run = page.getByRole("row").filter({ hasText: "Used searchDocuments" });
	await expect(run).toContainText("You");
	await expect(run).toContainText(/chat-assistant@\d/);
});
