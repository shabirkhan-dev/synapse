import { readFileSync } from "node:fs";

import { expect } from "@playwright/test";

import { E2E } from "./env";

/**
 * The token of the newest emailed link of a kind for `email`, read from the API log (development
 * mode logs each email instead of sending it). Waits for the line to appear.
 */
export async function emailedToken(
	email: string,
	path: "/verify-email" | "/reset-password",
): Promise<string> {
	const pattern = new RegExp(`${path}\\?token=([A-Za-z0-9_-]+)`);
	let token: string | undefined;
	await expect
		.poll(
			() => {
				const lines = readFileSync(E2E.apiLog, "utf8")
					.split("\n")
					.filter((line) => line.includes(email) && pattern.test(line));
				token = lines.at(-1)?.match(pattern)?.[1];
				return token;
			},
			{ message: `no ${path} email for ${email}`, timeout: 10_000 },
		)
		.toBeTruthy();
	return token ?? "";
}
