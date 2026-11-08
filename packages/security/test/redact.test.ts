import { describe, expect, test } from "bun:test";

import { redactPii, redactPiiDeep, redactSecrets } from "../src";

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

	test("never touches UUIDs, even ones whose groups are all digits", () => {
		const ids = [
			"23141549-3005-4927-bf89-5b2a07029ac6",
			"12345678-1234-1234-1234-123456789012",
			"9e7b740b-ddec-4576-9b2b-a1aa6735fe6f",
		];
		for (const id of ids) {
			expect(redactPii(id)).toBe(id);
			expect(redactPii(`chunk ${id} cited`)).toBe(`chunk ${id} cited`);
		}
		expect(redactPiiDeep({ citedChunkIds: ids })).toEqual({ citedChunkIds: ids });
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

	test("redactSecrets removes keys and tokens but keeps emails and numbers", () => {
		const key = ["sk-", "a".repeat(24)].join("");
		expect(redactSecrets(`Contact ada@example.com or +44 20 7946 0958, key ${key}`)).toBe(
			"Contact ada@example.com or +44 20 7946 0958, key [secret]",
		);
	});
});
