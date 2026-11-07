import type { LogFormat, LogLevel, ModelPrices } from "@synapse/observability";

import type { Env } from "./env";

export type TraceExport = {
	destination: "otlp" | "langfuse";
	/** OTLP/HTTP base URL; `/v1/traces` is appended. */
	endpoint: string;
	headers: Record<string, string>;
};

export type ObservabilityConfig = {
	logLevel: LogLevel;
	logFormat: LogFormat;
	/** Where spans are exported; traces are created but not exported when unset. */
	traceExport?: TraceExport;
	/** Prices for LLM cost estimates, keyed by `provider:model`. */
	modelPrices: ModelPrices;
};

export function createObservabilityConfig(env: Env): ObservabilityConfig {
	const traceExport = createTraceExport(env);
	return {
		logLevel: env.LOG_LEVEL,
		logFormat: env.LOG_FORMAT ?? (env.NODE_ENV === "production" ? "json" : "pretty"),
		...(traceExport ? { traceExport } : {}),
		modelPrices: env.AI_MODEL_PRICES,
	};
}

function createTraceExport(env: Env): TraceExport | undefined {
	if (env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY) {
		return {
			destination: "langfuse",
			endpoint: `${env.LANGFUSE_BASE_URL.replace(/\/$/, "")}/api/public/otel`,
			headers: {
				Authorization: `Basic ${btoa(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`)}`,
				// Without it, Langfuse may delay OTLP-ingested traces by up to 10 minutes.
				"x-langfuse-ingestion-version": "4",
			},
		};
	}
	if (env.OTEL_EXPORTER_OTLP_ENDPOINT) {
		return { destination: "otlp", endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT, headers: {} };
	}
	return undefined;
}
