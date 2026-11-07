import { describe, expect, test } from "bun:test";

import { splitSearchTerms } from "../src";

describe("splitSearchTerms", () => {
	test("keeps every meaningful word as an alternative, dropping common words", () => {
		expect(splitSearchTerms("how do I send a parcel back")).toEqual({
			include: ["send", "parcel", "back"],
			exclude: [],
		});
	});

	test("keeps common words when the query has nothing else", () => {
		expect(splitSearchTerms("to be or not to be")).toEqual({
			include: ["to", "be", "not", "to", "be"],
			exclude: [],
		});
	});

	test("never drops quoted phrases", () => {
		expect(splitSearchTerms('"the end" of it').include).toEqual(['"the end"']);
	});

	test("keeps quoted phrases and separates exclusions", () => {
		expect(splitSearchTerms('"api key" rotate -legacy -"old token" sku-4521')).toEqual({
			include: ['"api key"', "rotate", "sku-4521"],
			exclude: ["legacy", '"old token"'],
		});
	});

	test("drops bare or, empty phrases and blank input", () => {
		expect(splitSearchTerms('refund OR return "" -')).toEqual({
			include: ["refund", "return"],
			exclude: [],
		});
		expect(splitSearchTerms("   ")).toEqual({ include: [], exclude: [] });
	});
});
