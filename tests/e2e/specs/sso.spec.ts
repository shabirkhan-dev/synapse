import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { signIn, signUpViaApi } from "../support/accounts";
import { E2E, uniqueEmail } from "../support/env";
import { FAKE_OIDC } from "../support/fake-identity-provider";

const ISSUER = `http://127.0.0.1:${E2E.modelPort}/oidc`;

test("an owner sets up single sign-on; someone new signs in through it and lands in the team", async ({
	page,
	browser,
}) => {
	const owner = uniqueEmail("sso-owner");
	const team = `Acme ${Date.now()}`;
	const domain = `acme-${Date.now()}.test`;
	await signUpViaApi(owner);
	await signIn(page, owner);

	await page.goto("/team");
	await page.getByLabel("Team name").fill(team);
	await page.getByRole("button", { name: "Create team" }).click();
	await expect(page.getByRole("heading", { level: 1, name: team })).toBeVisible();

	await page.getByLabel("Issuer URL").fill(ISSUER);
	await page.getByLabel("Client ID").fill(FAKE_OIDC.clientId);
	await page.getByLabel("Client secret").fill(FAKE_OIDC.clientSecret);
	await page.getByLabel("Sign-in domains").fill(domain);
	await page.getByRole("button", { name: "Set up" }).click();
	const domains = page.getByRole("list", { name: "Domains" });
	await expect(domains.getByText("Waiting for DNS")).toBeVisible();
	await expect(page.getByText(`${E2E.consoleUrl}/sso/callback`)).toBeVisible();
	// The suite cannot publish a DNS record: mark the domain verified as the check would.
	const sql = postgres(E2E.databaseUrl, { max: 1, onnotice: () => {} });
	try {
		await sql`update sso_domains set verified_at = now() where domain = ${domain}`;
	} finally {
		await sql.end();
	}
	await page.reload();
	await expect(page.getByRole("list", { name: "Domains" }).getByText("Verified")).toBeVisible();

	// Someone new, in another browser: no account yet, no password.
	const context = await browser.newContext();
	const newcomer = await context.newPage();
	await newcomer.goto("/sign-in");
	await newcomer.getByRole("link", { name: "Use single sign-on" }).click();
	await expect(
		newcomer.getByRole("heading", { level: 1, name: "Sign in with single sign-on" }),
	).toBeVisible();
	await newcomer.getByLabel("Work email").fill(`new.person@${domain}`);
	await newcomer.getByRole("button", { name: "Continue" }).click();
	// Out to the provider and back to /sso/callback, then into the workspace.
	await newcomer.waitForURL("**/documents");
	await expect(newcomer.getByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
	await expect(newcomer.getByRole("combobox", { name: "Organization" })).toContainText(team);
	await expect(newcomer.getByText(/Verify your email/)).toHaveCount(0);
	await context.close();

	// The owner sees the new member.
	await page.reload();
	await expect(page.getByRole("cell", { name: `new.person@${domain}`, exact: true })).toBeVisible();
});

test("an email domain without single sign-on gets a clear answer", async ({ page }) => {
	await page.goto("/sso");
	await page.getByLabel("Work email").fill(uniqueEmail("nosso"));
	await page.getByRole("button", { name: "Continue" }).click();
	await expect(page.getByText(/not set up for this email's domain/)).toBeVisible();
});
