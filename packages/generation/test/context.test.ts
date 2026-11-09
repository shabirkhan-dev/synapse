import { describe, expect, test } from "bun:test";

import { buildContext, type Citation, extractCitations } from "../src";

const passage = (n: number, content = `passage ${n}`) => ({
	chunkId: `c${n}`,
	documentId: `d${n}`,
	title: `Doc ${n}`,
	source: n === 1 ? "https://a.test" : null,
	content,
});

/** A tokenizer that counts ~1 token per character (like CJK text). */
const perChar = (text: string) => text.length;

describe("buildContext", () => {
	test("numbers passages in order with title and source", () => {
		const context = buildContext([passage(1), passage(2)], { maxTokens: 1000 });
		expect(context.text).toBe("[1] Doc 1 (https://a.test)\npassage 1\n\n[2] Doc 2\npassage 2");
		expect(context.citations.map((c) => [c.index, c.chunkId])).toEqual([
			[1, "c1"],
			[2, "c2"],
		]);
		expect(context.omitted).toBe(0);
	});

	test("stops at the token budget but always keeps the first passage", () => {
		const long = "x".repeat(400); // ~100 tokens
		const context = buildContext([passage(1, long), passage(2, long)], { maxTokens: 150 });
		expect(context.citations).toHaveLength(1);
		expect(context.omitted).toBe(1);

		const tiny = buildContext([passage(1, long)], { maxTokens: 10 });
		expect(tiny.citations).toHaveLength(1);
		expect(tiny.text.length).toBe(40);
	});

	test("uses the supplied token counter, and a truncated first passage fits its count", () => {
		const long = "x".repeat(400);
		const counted = buildContext([passage(1, "short"), passage(2, long)], {
			maxTokens: 100,
			countTokens: perChar,
		});
		expect(counted.citations).toHaveLength(1);

		const tiny = buildContext([passage(1, long)], { maxTokens: 10, countTokens: perChar });
		expect(perChar(tiny.text)).toBeLessThanOrEqual(10);
		expect(tiny.text.length).toBeGreaterThan(0);
	});
});

describe("extractCitations", () => {
	const available: Citation[] = [1, 2, 3].map((index) => ({
		index,
		chunkId: `c${index}`,
		documentId: `d${index}`,
		title: `Doc ${index}`,
		source: null,
	}));

	test("returns cited passages once, in order of first mention", () => {
		const used = extractCitations("See [3] and [1][3], also [2, 1].", available);
		expect(used.map((c) => c.index)).toEqual([3, 1, 2]);
	});

	test("ignores numbers that are not in the context", () => {
		expect(extractCitations("Nothing [9] here", available)).toEqual([]);
	});
});
