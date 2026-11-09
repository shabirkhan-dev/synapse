import { type BindingStatus, loadBinding } from "./load-binding";

/** The ~4 characters per token rule the context budgets used before a tokenizer existed. */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

export type TokenCounter = {
	/** `o200k_base` when the Rust tokenizer is loaded, `estimate-chars/4` otherwise. */
	readonly tokenizer: string;
	readonly native: boolean;
	count(text: string): number;
	countMany(texts: string[]): number[];
};

/**
 * Token counts from the Rust BPE tokenizer (`crates/text-processing`, o200k_base) when its binding
 * is built for this platform, else the character estimate. Same API either way.
 */
export function createTokenCounter(status: BindingStatus = loadBinding()): TokenCounter {
	if (!status.loaded) {
		return {
			tokenizer: "estimate-chars/4",
			native: false,
			count: estimateTokens,
			countMany: (texts) => texts.map(estimateTokens),
		};
	}
	const { binding } = status;
	return {
		tokenizer: binding.tokenizer(),
		native: true,
		count: (text) => binding.countTokens(text),
		countMany: (texts) => binding.countTokensBatch(texts),
	};
}
