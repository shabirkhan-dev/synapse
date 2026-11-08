import { describe, expect, test } from "bun:test";

import { redactPii, redactPiiDeep } from "../src";

describe("redactPii", () => {
	test("replaces emails, phones and card numbers", () => {
		expect(redactPii("Mail ada.l@example.co.uk or call +44 20 7946 0958 today")).toBe(
			"Mail [email] or call [phone] today",
		);
		expect(redactPii("card 4111 1111 1111 1111 expires soon")).toBe("card [card] expires soon");
	});

	test("replaces tokens and provider keys", () => {
		const jwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiJ1c2VyLTEifQ", "c2lnbmF0dXJlLXZhbHVl"].join(
			".",
		);
		const keys = [
			"sk-",
			"a".repeat(24),
			" ",
			"re_",
			"b".repeat(24),
			" ",
			"dp.st.dev.",
			"c".repeat(24),
		].join("");
		expect(redactPii(`token ${jwt}`)).toBe("token [secret]");
		expect(redactPii(keys)).toBe("[secret] [secret] [secret]");
		expect(redactPii(`Authorization: Bearer ${"x".repeat(32)}`)).toBe(
			"Authorization: Bearer [secret]",
		);
	});

	test("leaves ordinary text, short numbers and dates alone", () => {
		const text =
			"Refunds within 30 days, SKU-4521, order 12345, on 2026-11-07, 600 requests per minute";
		expect(redactPii(text)).toBe(text);
	});

	test("deep redaction walks objects and arrays", () => {
		expect(
			redactPiiDeep({
				question: "email me at a@b.io",
				tags: ["x", "call 0300 1234567"],
				n: 3,
				ok: true,
			}),
		).toEqual({ question: "email me at [email]", tags: ["x", "call [phone]"], n: 3, ok: true });
	});
});
