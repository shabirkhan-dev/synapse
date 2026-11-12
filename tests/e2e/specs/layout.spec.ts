import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

const PAGES = [
	"/documents",
	"/playground",
	"/chat",
	"/approvals",
	"/activity",
	"/team",
	"/account",
];

// 320 CSS px is the WCAG 1.4.10 reflow width: nothing may scroll sideways or hide past the edge.
test("at 320px every workspace page reflows: no sideways scroll, every nav link and sign-out on screen", async ({
	page,
}) => {
	const email = uniqueEmail("phone");
	await signUpViaApi(email);
	await page.setViewportSize({ width: 320, height: 800 });
	await signIn(page, email);
	const nav = page.getByRole("navigation", { name: "Main" });
	for (const path of PAGES) {
		// oxlint-disable-next-line no-await-in-loop
		await page.goto(path);
		// oxlint-disable-next-line no-await-in-loop
		await expect(nav.locator("a[aria-current=page]")).toHaveAttribute("href", path);
		// oxlint-disable-next-line no-await-in-loop
		await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeInViewport();
		// oxlint-disable-next-line no-await-in-loop
		const links = await nav.getByRole("link").all();
		// oxlint-disable-next-line no-await-in-loop
		await Promise.all(links.map((link) => expect(link).toBeInViewport({ ratio: 1 })));
		// oxlint-disable-next-line no-await-in-loop
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow, `${path} scrolls sideways by ${overflow}px`).toBe(0);
	}
});
