import { describe, expect, test } from "bun:test";

import { parseEnv } from "@/config/env";
import { createObservabilityConfig } from "@/config/observability.config";

const traceExport = (source: Record<string, string>) =>
	createObservabilityConfig(parseEnv(source)).traceExport;

describe("trace export config", () => {
	test("exports nowhere by default", () => {
		expect(traceExport({})).toBeUndefined();
	});

	test("sends traces to Langfuse's OTLP endpoint with basic auth", () => {
		expect(
			traceExport({
				LANGFUSE_PUBLIC_KEY: "pk-lf-public",
				LANGFUSE_SECRET_KEY: "sk-lf-secret",
				LANGFUSE_BASE_URL: "https://us.cloud.langfuse.com/",
			}),
		).toEqual({
			destination: "langfuse",
			endpoint: "https://us.cloud.langfuse.com/api/public/otel",
			headers: {
				Authorization: `Basic ${btoa("pk-lf-public:sk-lf-secret")}`,
				"x-langfuse-ingestion-version": "4",
			},
		});
	});

	test("uses a plain OTLP collector without headers", () => {
		expect(traceExport({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318" })).toEqual({
			destination: "otlp",
			endpoint: "http://localhost:4318",
			headers: {},
		});
	});

	test("rejects half a Langfuse key pair and two destinations", () => {
		expect(() => parseEnv({ LANGFUSE_PUBLIC_KEY: "pk-lf-public" })).toThrow(/Set both/);
		expect(() =>
			parseEnv({
				LANGFUSE_PUBLIC_KEY: "pk-lf-public",
				LANGFUSE_SECRET_KEY: "sk-lf-secret",
				OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
			}),
		).toThrow(/not both/);
	});
});
