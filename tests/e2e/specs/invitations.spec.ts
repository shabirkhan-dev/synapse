import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { PASSWORD, uniqueEmail } from "../support/env";
import { emailedToken } from "../support/mail";

test("someone without an account is invited by email, signs up from the link and joins the team", async ({
	browser,
}) => {
	const owner = uniqueEmail("owner");
	const newcomer = uniqueEmail("newcomer");
	const team = `Support ${Date.now()}`;
	await signUpViaApi(owner);
	const ownerPage = await (await browser.newContext()).newPage();
	const newcomerPage = await (await browser.newContext()).newPage();

	// The owner adds an address with no account: it becomes an emailed invitation.
	await signIn(ownerPage, owner);
	await ownerPage.getByRole("link", { name: "Team", exact: true }).click();
	await ownerPage.getByLabel("Team name").fill(team);
	await ownerPage.getByRole("button", { name: "Create team" }).click();
	await expect(ownerPage.getByRole("heading", { name: team })).toBeVisible();
	await ownerPage.getByLabel("Email").fill(newcomer);
	await ownerPage.getByRole("button", { name: "Add member" }).click();
	await expect(ownerPage.getByText(`Invited ${newcomer}.`)).toBeVisible();
	await expect(
		ownerPage.getByRole("region", { name: "Invited, not joined yet" }).getByText(newcomer),
	).toBeVisible();

	// The newcomer opens the emailed link, creates an account and comes back to join.
	const token = await emailedToken(newcomer, "/invite");
	await newcomerPage.goto(`/invite?token=${token}`);
	await expect(newcomerPage.getByRole("heading", { name: "Join a team on Synapse" })).toBeVisible();
	await newcomerPage.getByRole("link", { name: "Create an account" }).click();
	await expect(
		newcomerPage.getByRole("heading", { name: "Create your Synapse account" }),
	).toBeVisible();
	await newcomerPage.getByLabel("Email").fill(newcomer);
	await newcomerPage.getByLabel("Password", { exact: true }).fill(PASSWORD);
	await newcomerPage.getByLabel("Repeat the password").fill(PASSWORD);
	await newcomerPage.getByRole("button", { name: "Create account" }).click();
	await expect(newcomerPage).toHaveURL(/\/invite/);
	await newcomerPage.getByRole("button", { name: "Join the team" }).click();
	await expect(newcomerPage.getByRole("heading", { name: `You joined ${team}` })).toBeVisible();
	await newcomerPage.getByRole("link", { name: "Open the team" }).click();
	await expect(newcomerPage.getByRole("combobox", { name: "Organization" })).toContainText(team);

	// The owner sees them as a member; the invitation is gone.
	await ownerPage.reload();
	await expect(ownerPage.getByRole("cell", { name: newcomer, exact: true })).toBeVisible();
	await expect(ownerPage.getByRole("region", { name: "Invited, not joined yet" })).toHaveCount(0);
});
