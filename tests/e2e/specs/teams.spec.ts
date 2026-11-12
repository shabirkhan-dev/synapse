import { expect, type Page, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

async function switchTo(page: Page, organization: string): Promise<void> {
	await page.getByRole("combobox", { name: "Organization" }).click();
	await page.getByRole("option", { name: organization }).click();
	await expect(page.getByRole("combobox", { name: "Organization" })).toHaveText(organization);
}

test("a member asks, an admin decides, in a shared team", async ({ browser }) => {
	const owner = uniqueEmail("owner");
	const member = uniqueEmail("member");
	const admin = uniqueEmail("admin");
	const team = `Support ${Date.now()}`;
	await signUpViaApi(owner);
	await signUpViaApi(member);
	await signUpViaApi(admin);
	const ownerPage = await (await browser.newContext()).newPage();
	const memberPage = await (await browser.newContext()).newPage();

	// The owner creates a team (the console switches into it) and adds the member.
	await signIn(ownerPage, owner);
	await expect(ownerPage.getByRole("combobox", { name: "Organization" })).toHaveText("Personal");
	await ownerPage.getByRole("link", { name: "Team" }).click();
	await expect(ownerPage.getByText(/This is your personal workspace/)).toBeVisible();
	await ownerPage.getByLabel("Team name").fill(team);
	await ownerPage.getByRole("button", { name: "Create team" }).click();
	await expect(ownerPage.getByRole("heading", { name: team })).toBeVisible();
	await expect(ownerPage.getByRole("combobox", { name: "Organization" })).toHaveText(team);
	await ownerPage.getByLabel("Email").fill(admin);
	await ownerPage.getByRole("combobox", { name: "Role", exact: true }).click();
	await ownerPage.getByRole("option", { name: "Admin" }).click();
	await ownerPage.getByRole("button", { name: "Add member" }).click();
	await expect(ownerPage.getByRole("combobox", { name: `Role of ${admin}` })).toHaveText("Admin");
	// The picker goes back to "Member": the next person is not made an admin by accident.
	await expect(ownerPage.getByRole("combobox", { name: "Role", exact: true })).toHaveText("Member");
	await ownerPage.getByLabel("Email").fill(member);
	await ownerPage.getByRole("button", { name: "Add member" }).click();
	await expect(ownerPage.getByRole("cell", { name: member, exact: true })).toBeVisible();
	await expect(ownerPage.getByRole("combobox", { name: `Role of ${member}` })).toHaveText("Member");

	// The member switches into the team, adds a document there and asks to delete everything.
	await signIn(memberPage, member);
	await switchTo(memberPage, team);
	await expect(memberPage.getByText("No documents yet")).toBeVisible();
	await memberPage.getByLabel("Title").fill("Team handbook");
	await memberPage.getByLabel("Text").fill("Escalate refunds over 500 euros to a lead.");
	await memberPage.getByRole("button", { name: "Add document" }).click();
	await expect(memberPage.getByRole("cell", { name: "Team handbook" })).toBeVisible();
	await memberPage.getByRole("button", { name: "Delete all documents…" }).click();
	await memberPage
		.getByRole("alertdialog")
		.getByRole("button", { name: "Ask for approval" })
		.click();
	await memberPage.getByRole("link", { name: "see Approvals" }).click();
	await expect(memberPage.getByText(/Requested by you/)).toBeVisible();
	await expect(memberPage.getByText("Waiting for an admin or owner to decide.")).toBeVisible();
	await expect(memberPage.getByRole("button", { name: "Approve" })).toHaveCount(0);

	// A member sees the team but cannot change it.
	await memberPage.getByRole("link", { name: "Team" }).click();
	await expect(
		memberPage.getByText("Only admins and owners add people or change roles."),
	).toBeVisible();
	await expect(memberPage.getByRole("button", { name: "Add member" })).toHaveCount(0);

	// The owner sees the member's request in the team and approves it.
	await ownerPage.getByRole("link", { name: "Approvals" }).click();
	await expect(ownerPage.getByText(/Requested by a member/)).toBeVisible();
	await ownerPage.getByRole("button", { name: "Approve" }).click();
	await expect(ownerPage.getByText("Approved. 1 document deleted.")).toBeVisible();

	// The owner's personal workspace was never touched; switching back shows it.
	await switchTo(ownerPage, "Personal");
	await expect(ownerPage.getByText("Nothing is waiting for a decision.")).toBeVisible();

	// The owner promotes the member; the member's own page reflects it on the next load.
	await switchTo(ownerPage, team);
	await ownerPage.getByRole("link", { name: "Team" }).click();
	await ownerPage.getByRole("combobox", { name: `Role of ${member}` }).click();
	await ownerPage.getByRole("option", { name: "Admin" }).click();
	await expect(ownerPage.getByRole("combobox", { name: `Role of ${member}` })).toHaveText("Admin");
	await memberPage.reload();
	await expect(memberPage.getByRole("combobox", { name: "Organization" })).toHaveText(team);
	await expect(memberPage.getByRole("button", { name: "Add member" })).toBeVisible();
});
