import { describe, expect, test } from "bun:test";

import { chunkText } from "@/modules/rag/text-chunker";

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
