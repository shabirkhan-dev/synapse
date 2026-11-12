import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("deleting all documents waits for approval; approving runs it; activity records each step", async ({
	page,
}) => {
	const email = uniqueEmail("oversight");
	await signUpViaApi(email);
	await signIn(page, email);
	await expect(page.getByText(email).first()).toBeVisible();

	await page.getByLabel("Title").fill("Refund policy");
	await page.getByLabel("Text").fill("Refunds are accepted within 30 days of purchase.");
	await page.getByRole("button", { name: "Add document" }).click();
	await expect(page.getByRole("cell", { name: "Refund policy" })).toBeVisible();

	// Asking does not delete anything yet.
	await page.getByRole("button", { name: "Delete all documents…" }).click();
	const dialog = page.getByRole("alertdialog");
	await expect(dialog.getByText("Delete every document?")).toBeVisible();
	await dialog.getByRole("button", { name: "Ask for approval" }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText(/Requested\. It runs once approved/)).toBeVisible();
	await page.reload();
	await expect(page.getByRole("cell", { name: "Refund policy" })).toBeVisible();

	await page.getByRole("link", { name: "Approvals" }).click();
	await expect(page.getByText(/Requested by you/)).toBeVisible();
	await expect(page.getByText("Delete all documents", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Approve" }).click();
	await expect(page.getByText("Approved. 1 document deleted.")).toBeVisible();
	await expect(page.getByText("Nothing is waiting for a decision.")).toBeVisible();

	await page.getByRole("link", { name: "Documents" }).click();
	await expect(page.getByText("No documents yet")).toBeVisible();

	await page.getByRole("link", { name: "Activity" }).click();
	const rows = page.getByRole("row");
	for (const what of [
		"Deleted all documents",
		"Decided an approval",
		"Asked for approval",
		"Added a document",
	]) {
		// oxlint-disable-next-line no-await-in-loop
		await expect(rows.filter({ hasText: what }).first()).toBeVisible();
	}
	await expect(rows.filter({ hasText: "Deleted all documents" })).toContainText("1 deleted");
});

test("a rejected request deletes nothing", async ({ page }) => {
	const email = uniqueEmail("reject");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByLabel("Title").fill("Keep me");
	await page.getByLabel("Text").fill("This document should survive.");
	await page.getByRole("button", { name: "Add document" }).click();
	await expect(page.getByRole("cell", { name: "Keep me" })).toBeVisible();

	await page.getByRole("button", { name: "Delete all documents…" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Ask for approval" }).click();
	await expect(page.getByRole("alertdialog")).toBeHidden();
	await page.getByRole("link", { name: "see Approvals" }).click();
	await page.getByLabel("Reason for rejecting").fill("Still needed");
	await page.getByRole("button", { name: "Reject" }).click();
	await expect(page.getByText("Rejected. The action did not run.")).toBeVisible();

	await page.getByRole("link", { name: "Documents" }).click();
	await expect(page.getByRole("cell", { name: "Keep me" })).toBeVisible();
});
