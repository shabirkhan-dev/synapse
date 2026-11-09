export { type Span, SpanStatusCode } from "@opentelemetry/api";
export { InMemorySpanExporter, type ReadableSpan } from "@opentelemetry/sdk-trace";

export { estimateCostUsd, type ModelPrice, type ModelPrices } from "./cost-tracking/estimate-cost";
export {
	instrumentModelGateway,
	type ModelGatewayInstrumentationOptions,
} from "./instrumentation/model-gateway";
export {
	createLogger,
	type LogFields,
	type LogFormat,
	type Logger,
	type LoggerOptions,
	type LogLevel,
	type LogSink,
} from "./logging/logger";
export {
	addSpanEvent,
	startTracing,
	TRACER_NAME,
	type Tracing,
	type TracingOptions,
	withSpan,
} from "./tracing/tracing";
