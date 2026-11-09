import { describe, expect, test } from "bun:test";

import { RETRIEVAL_SEED } from "@synapse/evaluation";
import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";

import { bindingFileName, createTokenCounter, estimateTokens, loadBinding } from "../src";

describe("binding loader", () => {
	test("names the file per platform, arch and libc", () => {
		expect(bindingFileName("linux", "x64", false)).toBe("synapse-bindings.linux-x64.node");
		expect(bindingFileName("linux", "arm64", true)).toBe("synapse-bindings.linux-arm64-musl.node");
		expect(bindingFileName("darwin", "arm64", false)).toBe("synapse-bindings.darwin-arm64.node");
	});

	test("a missing binding falls back to the estimate with a reason", () => {
		const status = loadBinding("synapse-bindings.nowhere-none.node");
		expect(status.loaded).toBe(false);
		const counter = createTokenCounter(status);
		expect(counter).toMatchObject({ native: false, tokenizer: "estimate-chars/4" });
		expect(counter.count("abcdefgh")).toBe(2);
		expect(counter.countMany(["abcd", ""])).toEqual([1, 0]);
	});
});

/** Runs where `bun run build:native` was run (CI builds it first); skipped otherwise. */
const status = loadBinding();
describe.skipIf(!status.loaded)("rust tokenizer", () => {
	const counter = createTokenCounter(status);
	const reference = new Tiktoken(o200k);
	const texts = [
		...RETRIEVAL_SEED.documents.map((document) => document.content),
		...RETRIEVAL_SEED.cases.map((item) => item.query),
		"返金は購入から30日以内に受け付けます。",
		"const x = await fetch(`/api/v1/rag/query?k=${k}`); // 🚀 emoji and code",
		"<|endoftext|> is plain text here",
		"",
	];

	test("counts exactly like o200k_base (js-tiktoken) on the eval corpus and edge cases", () => {
		expect(counter).toMatchObject({ native: true, tokenizer: "o200k_base" });
		const expected = texts.map((text) => reference.encode(text, [], []).length);
		expect(counter.countMany(texts)).toEqual(expected);
		expect(texts.map((text) => counter.count(text))).toEqual(expected);
	});

	test("the estimate it replaces is off for non-English text", () => {
		const japanese = "返金は購入から30日以内に受け付けます。";
		expect(counter.count(japanese)).toBeGreaterThan(estimateTokens(japanese));
	});
});
