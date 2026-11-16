import { describe, expect, test } from "bun:test";

import { chunkContext, chunkDocument, chunkEmbeddingText, chunkText } from "../src";

describe("chunkText", () => {
	test("returns nothing for blank input", () => {
		expect(chunkText("  \n\n ", { size: 100, overlap: 10 })).toEqual([]);
	});

	test("keeps short text as one chunk", () => {
		expect(chunkText("Hello world.", { size: 100, overlap: 10 })).toEqual(["Hello world."]);
	});

	test("never exceeds the chunk size and covers all words", () => {
		const text = Array.from(
			{ length: 60 },
			(_, i) => `Sentence number ${i} talks about topic ${i % 7}.`,
		).join(" ");
		const chunks = chunkText(text, { size: 200, overlap: 40 });
		expect(chunks.length).toBeGreaterThan(5);
		for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(200);
		for (let i = 0; i < 60; i++) expect(chunks.some((c) => c.includes(`number ${i} `))).toBe(true);
	});

	test("prefers paragraph boundaries", () => {
		const a = "A".repeat(80);
		const b = "B".repeat(80);
		expect(chunkText(`${a}\n\n${b}`, { size: 100, overlap: 0 })).toEqual([a, b]);
	});

	test("hard-splits a single long token", () => {
		const chunks = chunkText("x".repeat(250), { size: 100, overlap: 0 });
		expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
	});

	test("rejects overlap >= size", () => {
		expect(() => chunkText("abc", { size: 10, overlap: 10 })).toThrow();
	});
});

describe("chunkDocument", () => {
	const markdown = [
		"# Returns and refunds",
		"Returns within 30 days.",
		"## Exceptions",
		"Opened stoves cannot be returned.",
		"### Boots",
		"Custom boots are exchange only.",
		"## How refunds are paid",
		"```md",
		"# not a heading inside code",
		"```",
		"Back to the card within 5 days.",
	].join("\n");

	test("chunks never cross a section and carry the headings above them", () => {
		const chunks = chunkDocument(markdown, { size: 200, overlap: 0 });
		expect(chunks.map((chunk) => [chunk.headings.join(" / "), chunk.content])).toEqual([
			["Returns and refunds", "Returns within 30 days."],
			["Returns and refunds / Exceptions", "Opened stoves cannot be returned."],
			["Returns and refunds / Exceptions / Boots", "Custom boots are exchange only."],
			[
				"Returns and refunds / How refunds are paid",
				"```md\n# not a heading inside code\n```\nBack to the card within 5 days.",
			],
		]);
	});

	test("text without headings chunks exactly like chunkText", () => {
		const text = "First paragraph.\n\nSecond paragraph that is a little longer.";
		const options = { size: 30, overlap: 0 };
		expect(chunkDocument(text, options).map((chunk) => chunk.content)).toEqual(
			chunkText(text, options),
		);
		expect(chunkDocument(text, options).every((chunk) => chunk.headings.length === 0)).toBe(true);
	});
});

describe("chunkContext", () => {
	test("is the title and heading path, dropping a first heading that repeats the title", () => {
		expect(chunkContext("Returns and refunds", ["Returns and Refunds", "Exceptions"])).toBe(
			"Returns and refunds › Exceptions",
		);
		expect(chunkContext("Shipping", [])).toBe("Shipping");
		expect(chunkEmbeddingText("Shipping", "Express is $19.")).toBe("Shipping\n\nExpress is $19.");
		expect(chunkEmbeddingText(null, "Express is $19.")).toBe("Express is $19.");
	});
});
