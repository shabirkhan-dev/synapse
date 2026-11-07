# `@synapse/observability`

See what the system does: tracing, instrumentation, cost tracking and exporters.

> **Status:** Live (logging, tracing, instrumentation, cost tracking) · Planned (Langfuse exporter,
> metrics).

## Internal modules

`tracing/ instrumentation/ cost-tracking/ exporters/`

## Owns

- OpenTelemetry tracing
- Instrumentation helpers
- Token and cost tracking
- Exporters (Langfuse via `providers/langfuse`)
- Structured logging

## Does not own

- Audit history (→ `audit`)

## Depends on

`core`

## Public API

| Export | What it does |
| --- | --- |
| `createLogger({ service, level, format, fields })`, `Logger` | JSON or pretty lines; `child(fields)`; adds active `traceId`/`spanId`; serializes errors |
| `startTracing({ serviceName, otlpEndpoint?, exporter? })`, `Tracing` | Global tracer provider + AsyncLocalStorage context; OTLP/HTTP batch export when an endpoint is set; `shutdown()` flushes |
| `withSpan(name, attributes, fn)` | Active span around `fn`; errors recorded (status ERROR) and rethrown |
| `instrumentModelGateway(gateway, { logger, prices? })` | Spans `chat <model>` / `embeddings <model>` with `gen_ai.*` attributes, one `llm call` log line with tokens, duration and cost |
| `estimateCostUsd(usage, price)`, `ModelPrices` | USD from per-million-token prices keyed by `provider:model` |
| `InMemorySpanExporter`, `SpanStatusCode` | Re-exported for tests and status codes |

In `apps/api`: one span per request named by route pattern (`POST /api/v1/rag/query`,
`DELETE /api/v1/rag/documents/:id`) with `http.*` attributes and `synapse.request_id`; retrieval and
LLM spans are its children. Config: `LOG_LEVEL`, `LOG_FORMAT`, `OTEL_EXPORTER_OTLP_ENDPOINT`,
`AI_MODEL_PRICES`.
