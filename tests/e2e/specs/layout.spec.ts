import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

const PAGES = [
	"/documents",
	"/playground",
	"/retrieval",
	"/evaluations",
	"/agents",
	"/chat",
	"/approvals",
	"/activity",
	"/usage",
	"/system",
	"/team",
	"/account",
];

// 320 CSS px is the WCAG 1.4.10 reflow width: nothing may scroll sideways or hide past the edge.
// On phones the sidebar is a drawer behind the top bar's button.
test("at 320px every workspace page reflows and the drawer reaches every link and sign-out", async ({
	page,
}) => {
	const email = uniqueEmail("phone");
	await signUpViaApi(email);
	await page.setViewportSize({ width: 320, height: 800 });
	await signIn(page, email);
	const toggle = page.getByRole("button", { name: "Show or hide the sidebar" });
	for (const path of PAGES) {
		// oxlint-disable-next-line no-await-in-loop
		await page.goto(path);
		// oxlint-disable-next-line no-await-in-loop
		await expect(toggle).toBeInViewport();
		// oxlint-disable-next-line no-await-in-loop
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBe(0);

		// oxlint-disable-next-line no-await-in-loop
		await toggle.click();
		const nav = page.getByRole("navigation", { name: "Main" });
		// oxlint-disable-next-line no-await-in-loop
		const links = await nav.getByRole("link").all();
		expect(links.length).toBe(11);
		// oxlint-disable-next-line no-await-in-loop
		await Promise.all(links.map((link) => expect(link).toBeInViewport({ ratio: 1 })));
		// oxlint-disable-next-line no-await-in-loop
		await expect(page.getByRole("button", { name: "Account menu" })).toBeInViewport();
		// oxlint-disable-next-line no-await-in-loop
		await expect(page.locator(`a[aria-current=page][href="${path}"]`)).toBeVisible();
		// oxlint-disable-next-line no-await-in-loop
		await page.keyboard.press("Escape");
		// oxlint-disable-next-line no-await-in-loop
		await expect(nav).toBeHidden();
	}
});

test("on a phone, following a drawer link opens the page and closes the drawer", async ({
	page,
}) => {
	const email = uniqueEmail("drawer");
	await signUpViaApi(email);
	await page.setViewportSize({ width: 390, height: 800 });
	await signIn(page, email);
	await page.getByRole("button", { name: "Show or hide the sidebar" }).click();
	await page
		.getByRole("navigation", { name: "Main" })
		.getByRole("link", { name: "Activity", exact: true })
		.click();
	await expect(page).toHaveURL(/\/activity$/);
	await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
	await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
});

test("at 320px a table wider than the screen says so and can be scrolled with the keyboard", async ({
	page,
}) => {
	const email = uniqueEmail("narrow-table");
	await signUpViaApi(email);
	await page.setViewportSize({ width: 320, height: 800 });
	await signIn(page, email);
	await page.getByLabel("Title", { exact: true }).fill("Refund policy");
	await page.getByLabel("Text").fill("Refunds are accepted within 30 days of purchase.");
	await page.getByRole("button", { name: "Add document" }).click();
	const table = page.getByRole("region", { name: "Table, scrolls sideways" });
	await expect(table).toHaveAttribute("tabindex", "0");
	await expect(page.getByText("Scroll sideways to see all columns.")).toBeVisible();
	await table.focus();
	await page.keyboard.press("ArrowRight");
	await page.keyboard.press("ArrowRight");
	await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test("the theme follows the system until you choose one; the choice survives a reload", async ({
	page,
}) => {
	const email = uniqueEmail("theme");
	await signUpViaApi(email);
	await page.emulateMedia({ colorScheme: "dark" });
	await signIn(page, email);
	const html = page.locator("html");
	await expect(html).toHaveClass(/\bdark\b/);

	const chooseTheme = async (name: string) => {
		await page.getByRole("button", { name: "Account menu" }).click();
		await page.getByRole("menuitemradio", { name }).click();
	};
	await chooseTheme("Light");
	await expect(html).toHaveClass(/\blight\b/);

	await page.reload();
	await page.getByRole("heading", { level: 1, name: "Documents" }).waitFor();
	await expect(html).toHaveClass(/\blight\b/);
	await page.getByRole("button", { name: "Account menu" }).click();
	await expect(page.getByRole("menuitemradio", { name: "Light" })).toHaveAttribute(
		"aria-checked",
		"true",
	);
	await page.keyboard.press("Escape");

	await chooseTheme("System");
	await expect(html).toHaveClass(/\bdark\b/);
});
