import { RETRIEVAL_SEED } from "@synapse/evaluation";
import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";

import { createTokenCounter, estimateTokens } from "../src";

/**
 * `bun run bench` (after `bun run build:native`): the Rust tokenizer against js-tiktoken (the
 * same o200k_base BPE in pure JS) on documents of growing size. Prints ms per document.
 */
const native = createTokenCounter();
if (!native.native) throw new Error("native binding not built: run `bun run build:native` first");
const js = new Tiktoken(o200k);
const jsCount = (text: string) => js.encode(text, [], []).length;

const corpus = RETRIEVAL_SEED.documents.map((document) => document.content).join("\n\n");
const sized = (chars: number) => corpus.repeat(Math.ceil(chars / corpus.length)).slice(0, chars);

const time = (runs: number, fn: () => void) => {
	fn();
	const started = performance.now();
	for (let run = 0; run < runs; run++) fn();
	return (performance.now() - started) / runs;
};

console.info("chars       rust ms   js-tiktoken ms   speed-up   tokens (rust = js)   chars/4");
for (const chars of [1_000, 10_000, 100_000, 1_000_000]) {
	const text = sized(chars);
	const runs = chars >= 1_000_000 ? 5 : chars >= 100_000 ? 20 : 200;
	const rust = time(runs, () => native.count(text));
	const pure = time(runs, () => jsCount(text));
	const tokens = native.count(text);
	console.info(
		[
			String(chars).padEnd(10),
			rust.toFixed(3).padStart(8),
			pure.toFixed(3).padStart(16),
			`${(pure / rust).toFixed(1)}x`.padStart(10),
			`${tokens} ${tokens === jsCount(text) ? "=" : "≠"} ${jsCount(text)}`.padStart(20),
			String(estimateTokens(text)).padStart(9),
		].join(" "),
	);
}
