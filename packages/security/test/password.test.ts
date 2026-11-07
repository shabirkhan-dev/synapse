import { describe, expect, test } from "bun:test";

import { hashPassword, verifyPassword, verifyPasswordAgainstNothing } from "../src";

describe("passwords", () => {
	test("hashes with argon2id and a fresh salt", async () => {
		const [first, second] = await Promise.all([
			hashPassword("correct horse battery"),
			hashPassword("correct horse battery"),
		]);
		expect(first).toStartWith("$argon2id$");
		expect(first).not.toBe(second);
	});

	test("verifies the right password and rejects others", async () => {
		const hash = await hashPassword("correct horse battery");
		expect(await verifyPassword("correct horse battery", hash)).toBe(true);
		expect(await verifyPassword("Correct horse battery", hash)).toBe(false);
	});

	test("the no-account check always fails", async () => {
		expect(await verifyPasswordAgainstNothing("anything at all")).toBe(false);
	});
});
