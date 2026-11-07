import type { TokenUsage } from "@synapse/core/contracts";

/** USD per million tokens. */
export type ModelPrice = {
	inputPerMillionTokens: number;
	outputPerMillionTokens: number;
};

/** Prices keyed by `provider:model` (same format as provenance). */
export type ModelPrices = Record<string, ModelPrice>;

export function estimateCostUsd(usage: TokenUsage, price: ModelPrice): number {
	const input = ((usage.inputTokens ?? 0) * price.inputPerMillionTokens) / 1_000_000;
	const output = ((usage.outputTokens ?? 0) * price.outputPerMillionTokens) / 1_000_000;
	return input + output;
}
