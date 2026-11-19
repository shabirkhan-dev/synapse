import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { E2E, uniqueEmail } from "../support/env";

test("a document opens from the list with its chunks, and deleting it asks first", async ({
	page,
}) => {
	const email = uniqueEmail("doc");
	await signUpViaApi(email);
	await signIn(page, email);
	await page.getByRole("tab", { name: "Paste text" }).click();
	await page.getByLabel("Title", { exact: true }).fill("Shipping policy");
	await page.getByLabel("Source (optional)").fill("https://example.com/shipping");
	await page.getByLabel("Text", { exact: true }).fill("Orders ship within two business days.");
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

test("asking about one document searches only that document", async ({ page }) => {
	const email = uniqueEmail("scope");
	await signUpViaApi(email);
	await signIn(page, email);
	for (const [title, text] of [
		["Refund policy", "Refunds are accepted within 30 days of purchase."],
		["Shipping policy", "Orders ship within two business days; refunds of shipping are not given."],
	] as const) {
		await page.getByRole("tab", { name: "Paste text" }).click();
		await page.getByLabel("Title", { exact: true }).fill(title);
		await page.getByLabel("Text", { exact: true }).fill(text);
		await page.getByRole("button", { name: "Add document" }).click();
		await expect(page.getByRole("link", { name: title })).toBeVisible();
	}

	await page.getByRole("link", { name: "Shipping policy" }).click();
	await page.getByRole("link", { name: "Ask about this document" }).click();
	await expect(page).toHaveURL(/\/playground\?d=[0-9a-f-]{36}$/);
	await expect(page.getByText("Search in")).toBeVisible();
	await expect(page.getByRole("checkbox", { name: "Shipping policy" })).toBeChecked();
	await expect(page.getByRole("checkbox", { name: "Refund policy" })).not.toBeChecked();

	await page.getByLabel("Question").fill("How long do refunds take?");
	await page.getByRole("button", { name: "Ask", exact: true }).click();
	await expect(page.getByText("Searched 1 chosen document only.")).toBeVisible();
	const passages = page.getByRole("list", { name: "Retrieved passages" });
	await expect(passages.getByText(/Orders ship within two business days/)).toBeVisible();
	await expect(passages.getByText(/Refunds are accepted/)).toHaveCount(0);

	// Back to every document: both are searched again.
	await page.getByRole("button", { name: "Search all documents" }).click();
	await page.getByRole("button", { name: "Ask", exact: true }).click();
	await expect(passages.getByText(/Refunds are accepted/)).toBeVisible();
	await expect(page.getByText("Searched 1 chosen document only.")).toHaveCount(0);
});

test("several files are uploaded at once, and a web page is added by its address", async ({
	page,
}) => {
	const email = uniqueEmail("many");
	await signUpViaApi(email);
	await signIn(page, email);

	await page.getByLabel(/Choose a file/).setInputFiles([
		{
			name: "Returns.md",
			mimeType: "text/markdown",
			buffer: Buffer.from("# Returns\n\nWithin 14 days."),
		},
		{
			name: "Shipping.txt",
			mimeType: "text/plain",
			buffer: Buffer.from("Orders ship in two days."),
		},
	]);
	await page.getByRole("button", { name: "Upload 2 files" }).click();
	const results = page.getByRole("list", { name: "Upload results" });
	await expect(results).toContainText("Returns.md — Added");
	await expect(results).toContainText("Shipping.txt — Added");
	await expect(page.getByRole("link", { name: "Returns" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Shipping" })).toBeVisible();

	// Internal addresses are refused unless the deployment allows them (only this test stack does).
	await page.getByRole("tab", { name: "Web page" }).click();
	await page
		.getByLabel("Page address")
		.fill(`http://127.0.0.1:${E2E.modelPort}/pages/warranty.html`);
	await page.getByRole("button", { name: "Add page" }).click();
	await expect(page.getByText("Added “Warranty | Example shop”.")).toBeVisible();
	await page.getByRole("link", { name: "Warranty | Example shop" }).click();
	const chunks = page.getByRole("list", { name: "Chunks" });
	await expect(chunks.getByText(/two-year warranty/)).toBeVisible();
	await expect(chunks.getByText(/Water damage/)).toBeVisible();
	await expect(chunks.getByText(/track\(\)|Home · Shop/)).toHaveCount(0);
});
