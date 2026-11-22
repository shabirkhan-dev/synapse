import { expect, type Page, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

async function switchTo(page: Page, organization: string): Promise<void> {
	await page.getByRole("combobox", { name: "Organization" }).click();
	await page.getByRole("option", { name: organization }).click();
	await expect(page.getByRole("combobox", { name: "Organization" })).toContainText(organization);
}

test("a restricted document stays hidden from teammates until it is shared with them", async ({
	browser,
}) => {
	const owner = uniqueEmail("owner");
	const writer = uniqueEmail("writer");
	const reader = uniqueEmail("reader");
	const team = `Finance ${Date.now()}`;
	for (const email of [owner, writer, reader]) {
		// oxlint-disable-next-line no-await-in-loop -- accounts one at a time
		await signUpViaApi(email);
	}
	const ownerPage = await (await browser.newContext()).newPage();
	const writerPage = await (await browser.newContext()).newPage();
	const readerPage = await (await browser.newContext()).newPage();

	// The owner creates a team with two members.
	await signIn(ownerPage, owner);
	await ownerPage.getByRole("link", { name: "Team", exact: true }).click();
	await ownerPage.getByLabel("Team name").fill(team);
	await ownerPage.getByRole("button", { name: "Create team" }).click();
	await expect(ownerPage.getByRole("heading", { name: team })).toBeVisible();
	for (const email of [writer, reader]) {
		// oxlint-disable-next-line no-await-in-loop -- members one at a time
		await ownerPage.getByLabel("Email").fill(email);
		// oxlint-disable-next-line no-await-in-loop
		await ownerPage.getByRole("button", { name: "Add member" }).click();
		// oxlint-disable-next-line no-await-in-loop
		await expect(ownerPage.getByRole("cell", { name: email, exact: true })).toBeVisible();
	}

	// The writer adds a document for their eyes only.
	await signIn(writerPage, writer);
	await switchTo(writerPage, team);
	await writerPage.getByRole("tab", { name: "Paste text" }).click();
	await writerPage.getByLabel("Title", { exact: true }).fill("Salary bands");
	await writerPage
		.getByLabel("Text", { exact: true })
		.fill("Engineers are paid in four salary bands, reviewed every March.");
	await writerPage.getByText("Only me for now").click();
	await writerPage.getByRole("button", { name: "Add document" }).click();
	await expect(writerPage.getByRole("cell", { name: /Salary bands/ })).toContainText(
		"(restricted)",
	);

	// The other member does not see it, nor find it.
	await signIn(readerPage, reader);
	await switchTo(readerPage, team);
	await expect(readerPage.getByText("No documents yet")).toBeVisible();
	await readerPage.getByRole("link", { name: "Retrieval", exact: true }).click();
	await readerPage.getByLabel("Search for").fill("salary bands");
	await readerPage.getByRole("button", { name: "Compare" }).click();
	await expect(readerPage.getByText(/No passages/).first()).toBeVisible();

	// The owner sees it (owners and admins read everything).
	await ownerPage.getByRole("link", { name: "Documents", exact: true }).click();
	await expect(
		ownerPage.getByRole("main").getByRole("link", { name: "Salary bands" }),
	).toBeVisible();

	// The writer shares it with the other member from its page.
	await writerPage.getByRole("main").getByRole("link", { name: "Salary bands" }).click();
	await expect(writerPage.getByRole("heading", { name: "Who can see it" })).toBeVisible();
	await writerPage.getByText(reader).click();
	await writerPage.getByRole("button", { name: "Save who can see it" }).click();
	await expect(writerPage.getByText(/whoever added it and 1 person/)).toBeVisible();

	// Now the member finds it.
	// A fresh load (the list it saw a moment ago is cached in the page).
	await readerPage.goto("/documents");
	await expect(
		readerPage.getByRole("main").getByRole("link", { name: "Salary bands" }),
	).toBeVisible();
});
