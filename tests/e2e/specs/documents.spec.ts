import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("a document opens from the list with its chunks, and deleting it asks first", async ({
	page,
}) => {
	const email = uniqueEmail("doc");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByLabel("Title", { exact: true }).fill("Shipping policy");
	await page.getByLabel("Source (optional)").fill("https://example.com/shipping");
	await page.getByLabel("Text").fill("Orders ship within two business days.");
	await page.getByRole("button", { name: "Add document" }).click();

	await page.getByRole("link", { name: "Shipping policy" }).click();
	await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}$/);
	const address = page.url();
	await expect(page.getByRole("heading", { level: 1, name: "Shipping policy" })).toBeVisible();
	await expect(page.getByRole("link", { name: "https://example.com/shipping" })).toBeVisible();
	const chunks = page.getByRole("list", { name: "Chunks" });
	await expect(chunks.getByText("Chunk 1")).toBeVisible();
	await expect(chunks.getByText("Orders ship within two business days.")).toBeVisible();
	await expect(chunks.getByText("Out of date")).toHaveCount(0);
	// The sidebar still marks Documents while you are inside one.
	await expect(page.getByRole("link", { name: "Documents", exact: true }).first()).toHaveAttribute(
		"aria-current",
		"true",
	);

	await page.getByRole("button", { name: "Delete document…" }).click();
	const dialog = page.getByRole("alertdialog");
	await expect(dialog.getByText("Delete “Shipping policy”?")).toBeVisible();
	await dialog.getByRole("button", { name: "Delete document" }).click();
	await expect(page).toHaveURL(/\/documents$/);
	await expect(page.getByText("No documents yet")).toBeVisible();

	await page.goto(address);
	await expect(page.getByText("This document does not exist")).toBeVisible();
});

test("a Markdown file is uploaded under its name and its text is searchable", async ({ page }) => {
	const email = uniqueEmail("upload");
	await signUpViaApi(email);
	await signIn(page, email);

	const picker = page.getByLabel(/Choose a file/);
	await picker.setInputFiles({
		name: "slides.pptx",
		mimeType: "application/vnd.ms-powerpoint",
		buffer: Buffer.from("PK"),
	});
	await page.getByRole("button", { name: "Upload file" }).click();
	await expect(page.getByText("Upload a .txt, .md or .pdf file")).toBeVisible();

	await page.getByLabel(/slides\.pptx/).setInputFiles({
		name: "Returns guide.md",
		mimeType: "text/markdown",
		buffer: Buffer.from("# Returns\n\nItems can be returned within **14 days**."),
	});
	await expect(page.getByText("Returns guide.md")).toBeVisible();
	await page.getByRole("button", { name: "Upload file" }).click();

	const row = page.getByRole("row", { name: /Returns guide/ });
	await expect(row.getByRole("cell", { name: "Returns guide.md" })).toBeVisible();
	await expect(page.getByText("Choose a file or drop it here")).toBeVisible();

	await page.getByRole("link", { name: "Returns guide" }).click();
	await expect(page.getByRole("heading", { level: 1, name: "Returns guide" })).toBeVisible();
	await expect(
		page.getByRole("list", { name: "Chunks" }).getByText(/returned within \*\*14 days\*\*/),
	).toBeVisible();
});
