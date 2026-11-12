import { expect, test } from "@playwright/test";

import { signIn, signUpViaApi } from "../support/accounts";
import { uniqueEmail } from "../support/env";

test("on a phone every workspace page fits the width and sign-out stays reachable", async ({
	page,
}) => {
	const email = uniqueEmail("phone");
	await signUpViaApi(email);
	await page.setViewportSize({ width: 390, height: 800 });
	await signIn(page, email);
	for (const path of ["/documents", "/playground", "/approvals", "/activity", "/team"]) {
		// oxlint-disable-next-line no-await-in-loop
		await page.goto(path);
		// oxlint-disable-next-line no-await-in-loop
		await expect(page.getByRole("button", { name: "Sign out" })).toBeInViewport();
		// oxlint-disable-next-line no-await-in-loop
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > window.innerWidth,
		);
		expect(overflow, `${path} scrolls sideways`).toBe(false);
	}
});
