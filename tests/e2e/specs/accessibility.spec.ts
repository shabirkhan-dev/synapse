import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

/** Automated checks against WCAG 2.2 A and AA; a screen-reader pass stays manual. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const SIGNED_OUT = ["/sign-in", "/sign-up", "/forgot-password", "/sso"];
const WORKSPACE = [
	"/documents",
	"/chat",
	"/playground",
	"/retrieval",
	"/evaluations",
	"/agents",
	"/approvals",
	"/activity",
	"/usage",
	"/system",
	"/team",
	"/account",
];

/** Serious and critical violations, one line each: rule, impact, where. */
async function violations(page: Page): Promise<string[]> {
	const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
	return results.violations
		.filter((violation) => violation.impact === "serious" || violation.impact === "critical")
		.map(
			(violation) =>
				`${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes
					.slice(0, 3)
					.map((node) => `${node.target.join(" ")} ${node.html.slice(0, 160)}`)
					.join(", ")}`,
		);
}

async function setTheme(page: Page, theme: "light" | "dark") {
	await page.evaluate((value) => localStorage.setItem("theme", value), theme);
}

test.setTimeout(180_000);

test("signed-out pages have no serious or critical accessibility violations", async ({ page }) => {
	for (const theme of ["light", "dark"] as const) {
		await page.goto("/sign-in");
		await setTheme(page, theme);
		for (const path of SIGNED_OUT) {
			// oxlint-disable-next-line no-await-in-loop -- one page at a time
			await page.goto(path);
			// oxlint-disable-next-line no-await-in-loop
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
			// oxlint-disable-next-line no-await-in-loop
			expect(await violations(page), `${theme} ${path}`).toEqual([]);
		}
	}
});

test("every workspace page, with content, has no serious or critical violations", async ({
	page,
}) => {
	const email = uniqueEmail("a11y");
	await signUpViaApi(email);
	await signIn(page, email);
	// Content on the pages: sample documents, an answer, a conversation.
	await page.getByRole("button", { name: "Add sample documents" }).click();
	await expect(page.getByRole("main").getByRole("table")).toBeVisible();
	await page.goto("/chat");
	await page
		.getByLabel("Message", { exact: true })
		.fill("How long do customers have to return an item?");
	await page.getByLabel("Message", { exact: true }).press("Enter");
	await expect(page.getByRole("button", { name: "Regenerate" })).toBeVisible();

	for (const theme of ["light", "dark"] as const) {
		await setTheme(page, theme);
		for (const path of WORKSPACE) {
			// oxlint-disable-next-line no-await-in-loop -- one page at a time
			await page.goto(path);
			// oxlint-disable-next-line no-await-in-loop
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
			// Let queries settle so the page is checked with its content, not its loading state.
			// oxlint-disable-next-line no-await-in-loop
			await page.waitForLoadState("networkidle");
			// oxlint-disable-next-line no-await-in-loop
			expect(await violations(page), `${theme} ${path}`).toEqual([]);
		}
		// Open surfaces: the palette and the account menu.
		await page.keyboard.press("Control+k");
		await expect(page.getByRole("dialog", { name: "Search Synapse" })).toBeVisible();
		expect(await violations(page), `${theme} palette`).toEqual([]);
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: "Account menu" }).click();
		await expect(page.getByRole("menu")).toBeVisible();
		expect(await violations(page), `${theme} account menu`).toEqual([]);
		await page.keyboard.press("Escape");
	}
});
