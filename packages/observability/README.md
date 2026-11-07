# @synapse/observability

Structured logging, OpenTelemetry tracing and LLM usage/cost tracking. The only package that
imports `@opentelemetry/*` (enforced by `architecture:check`). Full description:
[docs/packages/observability.md](../../docs/packages/observability.md).

```ts
import { createLogger, instrumentModelGateway, startTracing, withSpan } from "@synapse/observability";

const tracing = startTracing({ serviceName: "synapse-api", otlpEndpoint: "http://localhost:4318" });
const logger = createLogger({ service: "synapse-api", format: "json" });
const gateway = instrumentModelGateway(rawGateway, { logger, prices });

await withSpan("ingest", { documents: 1 }, async () => {
	logger.info("working"); // carries traceId + spanId
});
await tracing.shutdown(); // flushes pending spans
```

| Module | Status |
| --- | --- |
| `logging/` — `createLogger` (json / pretty, levels, `child`, trace ids) | Live |
| `tracing/` — `startTracing` (OTLP/HTTP), `withSpan` | Live |
| `instrumentation/` — `instrumentModelGateway` (GenAI spans + usage logs) | Live |
| `cost-tracking/` — `estimateCostUsd` | Live |
| `exporters/` — Langfuse | Planned (syn-020, needs credentials) |
