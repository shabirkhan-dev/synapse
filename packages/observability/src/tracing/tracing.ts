import { type Attributes, context, type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BatchSpanProcessor,
	SimpleSpanProcessor,
	type SpanExporter,
	type SpanProcessor,
	TracerProvider,
} from "@opentelemetry/sdk-trace";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

export const TRACER_NAME = "synapse";

export type TracingOptions = {
	serviceName: string;
	serviceVersion?: string;
	/** OTLP/HTTP base URL (e.g. `http://localhost:4318`); spans are exported in batches when set. */
	otlpEndpoint?: string;
	/** Extra exporter, flushed per span (tests use `InMemorySpanExporter`). */
	exporter?: SpanExporter;
};

export type Tracing = {
	/** Flush and stop exporting; unregisters the global provider. */
	shutdown(): Promise<void>;
	forceFlush(): Promise<void>;
};

/**
 * Register the global tracer provider and an AsyncLocalStorage context manager, so spans started
 * inside a request (HTTP → retrieval → LLM call) become children of the request span.
 * Without an endpoint or exporter, spans are still created (ids for logs) but not exported.
 */
export function startTracing({
	serviceName,
	serviceVersion,
	otlpEndpoint,
	exporter,
}: TracingOptions): Tracing {
	const spanProcessors: SpanProcessor[] = [];
	if (otlpEndpoint) {
		const url = `${otlpEndpoint.replace(/\/$/, "")}/v1/traces`;
		spanProcessors.push(new BatchSpanProcessor({ exporter: new OTLPTraceExporter({ url }) }));
	}
	if (exporter) {
		spanProcessors.push(new SimpleSpanProcessor({ exporter }));
	}
	const provider = new TracerProvider({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: serviceName,
			...(serviceVersion ? { [ATTR_SERVICE_VERSION]: serviceVersion } : {}),
		}),
		spanProcessors,
	});
	context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
	trace.setGlobalTracerProvider(provider);

	return {
		forceFlush: () => provider.forceFlush(),
		async shutdown() {
			await provider.shutdown();
			trace.disable();
			context.disable();
		},
	};
}

/**
 * Run `fn` inside an active span. Errors are recorded on the span (status ERROR) and rethrown;
 * the span always ends.
 */
export async function withSpan<T>(
	name: string,
	attributes: Attributes,
	fn: (span: Span) => Promise<T>,
): Promise<T> {
	return trace.getTracer(TRACER_NAME).startActiveSpan(name, { attributes }, async (span) => {
		try {
			return await fn(span);
		} catch (error) {
			span.recordException(error instanceof Error ? error : String(error));
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : String(error),
			});
			throw error;
		} finally {
			span.end();
		}
	});
}
