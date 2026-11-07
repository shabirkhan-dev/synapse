import type { LogFormat, LogLevel, ModelPrices } from "@synapse/observability";

import type { Env } from "./env";

export type ObservabilityConfig = {
	logLevel: LogLevel;
	logFormat: LogFormat;
	/** OTLP/HTTP collector; traces are created but not exported when unset. */
	otlpEndpoint?: string;
	/** Prices for LLM cost estimates, keyed by `provider:model`. */
	modelPrices: ModelPrices;
};

export function createObservabilityConfig(env: Env): ObservabilityConfig {
	return {
		logLevel: env.LOG_LEVEL,
		logFormat: env.LOG_FORMAT ?? (env.NODE_ENV === "production" ? "json" : "pretty"),
		...(env.OTEL_EXPORTER_OTLP_ENDPOINT ? { otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT } : {}),
		modelPrices: env.AI_MODEL_PRICES,
	};
}
