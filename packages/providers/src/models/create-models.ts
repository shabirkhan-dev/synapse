import { createAnthropic } from "@ai-sdk/anthropic";
import { createCohere } from "@ai-sdk/cohere";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ModelInfo } from "@synapse/core/contracts";
import {
	defaultEmbeddingSettingsMiddleware,
	type EmbeddingModel,
	type LanguageModel,
	wrapEmbeddingModel,
} from "ai";

import type { ChatModelSpec, EmbeddingModelSpec } from "./model-spec";

type VendorEmbeddingModel = Parameters<typeof wrapEmbeddingModel>[0]["model"];

export type ChatModelHandle = { model: LanguageModel; info: ModelInfo };
export type EmbeddingModelHandle = { model: EmbeddingModel; info: ModelInfo };

/** Settings shared by every vendor factory. Keys and URLs are always passed, never read from env. */
function connection(spec: { apiKey?: string; baseUrl?: string; fetch?: typeof fetch }) {
	return {
		...(spec.apiKey ? { apiKey: spec.apiKey } : {}),
		...(spec.baseUrl ? { baseURL: spec.baseUrl } : {}),
		...(spec.fetch ? { fetch: spec.fetch } : {}),
	};
}

function compatible(
	spec: Extract<ChatModelSpec | EmbeddingModelSpec, { provider: "openai-compatible" }>,
) {
	return createOpenAICompatible({
		...connection(spec),
		name: spec.name,
		baseURL: spec.baseUrl,
		includeUsage: true,
	});
}

const providerName = (spec: ChatModelSpec | EmbeddingModelSpec) =>
	spec.provider === "openai-compatible" ? spec.name : spec.provider;

/** An AI SDK chat model for `spec`, plus the provider/model pair recorded in provenance. */
export function createChatModel(spec: ChatModelSpec): ChatModelHandle {
	const info = { provider: providerName(spec), model: spec.model };
	switch (spec.provider) {
		case "openai-compatible":
			return { info, model: compatible(spec).chatModel(spec.model) };
		case "openai":
			return { info, model: createOpenAI(connection(spec))(spec.model) };
		case "anthropic":
			return { info, model: createAnthropic(connection(spec))(spec.model) };
		case "google":
			return { info, model: createGoogleGenerativeAI(connection(spec))(spec.model) };
		case "cohere":
			return { info, model: createCohere(connection(spec))(spec.model) };
	}
}

/**
 * An AI SDK embedding model for `spec`. `dimensions` is sent as the vendor's own option (OpenAI
 * `dimensions`, Google `outputDimensionality`, Cohere `outputDimension`); OpenAI-compatible
 * endpoints get the model's default size.
 */
export function createEmbeddingModel(spec: EmbeddingModelSpec): EmbeddingModelHandle {
	const info = { provider: providerName(spec), model: spec.model };
	const sized = (model: VendorEmbeddingModel, vendor: string, option: string): EmbeddingModel =>
		spec.dimensions === undefined
			? model
			: wrapEmbeddingModel({
					model,
					middleware: defaultEmbeddingSettingsMiddleware({
						settings: { providerOptions: { [vendor]: { [option]: spec.dimensions } } },
					}),
				});
	switch (spec.provider) {
		case "openai-compatible":
			return { info, model: compatible(spec).embeddingModel(spec.model) };
		case "openai":
			return {
				info,
				model: sized(createOpenAI(connection(spec)).embedding(spec.model), "openai", "dimensions"),
			};
		case "google":
			return {
				info,
				model: sized(
					createGoogleGenerativeAI(connection(spec)).embedding(spec.model),
					"google",
					"outputDimensionality",
				),
			};
		case "cohere":
			return {
				info,
				model: sized(
					createCohere(connection(spec)).embedding(spec.model),
					"cohere",
					"outputDimension",
				),
			};
	}
}
