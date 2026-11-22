import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { E2E, PASSWORD, uniqueEmail } from "../support/env";

/** Add documents through the API (faster than the form), as the signed-up user. */
async function addDocuments(email: string, titles: string[]): Promise<void> {
	const signedIn = await fetch(`${E2E.apiUrl}/auth/sign-in`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, password: PASSWORD }),
	});
	const token = (await signedIn.json()).data.tokens.accessToken as string;
	for (const title of titles) {
		// oxlint-disable-next-line no-await-in-loop -- in order, so the first is the oldest
		const response = await fetch(`${E2E.apiUrl}/rag/documents`, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
			body: JSON.stringify({ title, content: `${title}: the details of this document.` }),
		});
		expect(response.status).toBe(201);
	}
}

test("search finds documents beyond the latest eight; the frame shows while the session loads", async ({
	page,
}) => {
	const email = uniqueEmail("search");
	await signUpViaApi(email);
	// The oldest falls outside the eight latest the palette lists before anything is typed.
	await addDocuments(email, [
		"Warranty terms 2019",
		...Array.from({ length: 9 }, (_, index) => `Policy note ${index + 1}`),
	]);
	await signIn(page, email);

	await page.keyboard.press("Control+k");
	const palette = page.getByRole("dialog", { name: "Search Synapse" });
	await expect(palette.getByText("Policy note 9")).toBeVisible();
	await expect(palette.getByText("Warranty terms 2019")).toHaveCount(0);
	await page.keyboard.type("warranty");
	await palette.getByText("Warranty terms 2019").click();
	await expect(page.getByRole("heading", { level: 1, name: "Warranty terms 2019" })).toBeVisible();

	// A slow session restore: the sidebar and an outline show at once, the page when it answers.
	let release: () => void = () => {};
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route("**/api/v1/auth/refresh", async (route) => {
		await held;
		await route.continue();
	});
	await page.goto("/usage");
	await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
	await expect(
		page.getByRole("status").filter({ hasText: "Loading your workspace" }),
	).toBeAttached();
	await expect(page.getByRole("heading", { level: 1, name: "Usage" })).toHaveCount(0);
	release();
	await expect(page.getByRole("heading", { level: 1, name: "Usage" })).toBeVisible();
});
