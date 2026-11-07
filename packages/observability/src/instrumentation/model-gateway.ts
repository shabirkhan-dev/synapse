import type { ModelGateway, ModelInfo } from "@synapse/core/contracts";

import { estimateCostUsd, type ModelPrices } from "../cost-tracking/estimate-cost";
import type { Logger } from "../logging/logger";
import { withSpan } from "../tracing/tracing";

export type ModelGatewayInstrumentationOptions = {
	logger: Logger;
	/** Optional prices for cost estimates, keyed by `provider:model`. */
	prices?: ModelPrices;
};

/** OpenTelemetry GenAI semantic-convention attribute names. */
const GEN_AI = {
	OPERATION: "gen_ai.operation.name",
	PROVIDER: "gen_ai.provider.name",
	MODEL: "gen_ai.request.model",
	INPUT_TOKENS: "gen_ai.usage.input_tokens",
	OUTPUT_TOKENS: "gen_ai.usage.output_tokens",
} as const;

const modelKey = ({ provider, model }: ModelInfo) => `${provider}:${model}`;

/**
 * Wrap any `ModelGateway` so every call gets a span (`chat <model>`, `embeddings <model>`) with
 * GenAI attributes, plus one log line with model, duration, tokens and — when a price is
 * configured — estimated cost. Extra properties of the gateway (e.g. `chatModel`) are kept.
 */
export function instrumentModelGateway<TGateway extends ModelGateway>(
	gateway: TGateway,
	{ logger, prices = {} }: ModelGatewayInstrumentationOptions,
): TGateway {
	const { chat, embedding } = gateway;

	return Object.assign({}, gateway, {
		chat: {
			info: chat.info,
			generateText: (request: Parameters<typeof chat.generateText>[0]) =>
				withSpan(
					`chat ${chat.info.model}`,
					{
						[GEN_AI.OPERATION]: "chat",
						[GEN_AI.PROVIDER]: chat.info.provider,
						[GEN_AI.MODEL]: chat.info.model,
					},
					async (span) => {
						const started = performance.now();
						const result = await chat.generateText(request);
						const { inputTokens, outputTokens } = result.usage;
						if (inputTokens !== undefined) span.setAttribute(GEN_AI.INPUT_TOKENS, inputTokens);
						if (outputTokens !== undefined) span.setAttribute(GEN_AI.OUTPUT_TOKENS, outputTokens);
						const price = prices[modelKey(result.model)];
						const costUsd = price ? estimateCostUsd(result.usage, price) : undefined;
						if (costUsd !== undefined) span.setAttribute("synapse.cost_usd", costUsd);
						logger.info("llm call", {
							operation: "chat",
							model: modelKey(result.model),
							durationMs: Math.round(performance.now() - started),
							...(inputTokens === undefined ? {} : { inputTokens }),
							...(outputTokens === undefined ? {} : { outputTokens }),
							...(costUsd === undefined ? {} : { costUsd }),
						});
						return result;
					},
				),
		},
		embedding: {
			info: embedding.info,
			embed: (value: string, options?: Parameters<typeof embedding.embed>[1]) =>
				traceEmbedding(1, () => embedding.embed(value, options)),
			embedMany: (values: string[], options?: Parameters<typeof embedding.embedMany>[1]) =>
				traceEmbedding(values.length, () => embedding.embedMany(values, options)),
		},
	});

	function traceEmbedding<T>(inputs: number, call: () => Promise<T>): Promise<T> {
		return withSpan(
			`embeddings ${embedding.info.model}`,
			{
				[GEN_AI.OPERATION]: "embeddings",
				[GEN_AI.PROVIDER]: embedding.info.provider,
				[GEN_AI.MODEL]: embedding.info.model,
				"synapse.embedding.inputs": inputs,
			},
			async () => {
				const started = performance.now();
				const result = await call();
				logger.info("llm call", {
					operation: "embeddings",
					model: modelKey(embedding.info),
					inputs,
					durationMs: Math.round(performance.now() - started),
				});
				return result;
			},
		);
	}
}
