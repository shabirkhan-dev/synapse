import { describe, expect, test } from "bun:test";

import { normalizeDocument, normalizeText } from "../src";

const ZWSP = String.fromCodePoint(0x200b);
const COMBINING_ACUTE = String.fromCodePoint(0x301);
const E_ACUTE = String.fromCodePoint(0xe9);

describe("normalizeText", () => {
	test("unifies line endings, trims, drops invisible characters and extra blank lines", () => {
		expect(normalizeText(`  a\r\nb${ZWSP}  \r\n\r\n\r\n\r\nc\u0000 \n`)).toBe("a\nb\n\nc");
	});

	test("composes Unicode so visually equal text compares equal", () => {
		expect(normalizeText(`cafe${COMBINING_ACUTE}`)).toBe(`caf${E_ACUTE}`);
	});
});

describe("normalizeDocument", () => {
	test("collapses title whitespace, empties blank sources, defaults metadata", () => {
		expect(normalizeDocument({ title: "  Refund \n policy ", content: "x", source: "  " })).toEqual(
			{ title: "Refund policy", content: "x", source: null, metadata: {} },
		);
	});

	test("keeps source and metadata", () => {
		const doc = normalizeDocument({
			title: "t",
			content: "x",
			source: " https://a.test ",
			metadata: { lang: "en" },
		});
		expect(doc.source).toBe("https://a.test");
		expect(doc.metadata).toEqual({ lang: "en" });
	});
});
