# `@synapse/observability`

See what the system does: tracing, instrumentation, cost tracking and exporters.

> **Status:** Live (logging, tracing, instrumentation, cost tracking, Langfuse export over OTLP) ·
> Planned (metrics, prompt-version links in Langfuse).

## Internal modules

`tracing/ instrumentation/ cost-tracking/ exporters/`

## Owns

- OpenTelemetry tracing
- Instrumentation helpers
- Token and cost tracking
- Trace export: any OTLP/HTTP collector, including Langfuse's OTLP endpoint (no Langfuse SDK)
- Structured logging

## Does not own

- Audit history (→ `audit`)

## Depends on

`core`

## Public API

| Export | What it does |
| --- | --- |
| `createLogger({ service, level, format, fields })`, `Logger` | JSON or pretty lines; `child(fields)`; adds active `traceId`/`spanId`; serializes errors |
| `startTracing({ serviceName, otlpEndpoint?, otlpHeaders?, exporter? })`, `Tracing` | Global tracer provider + AsyncLocalStorage context; OTLP/HTTP batch export (with headers, e.g. auth) when an endpoint is set; `shutdown()` flushes |
| `withSpan(name, attributes, fn)` | Active span around `fn`; errors recorded (status ERROR) and rethrown |
| `instrumentReranker(reranker, { logger })` | Span `rerank <model>` (GenAI attributes, `synapse.rerank.documents`) and a log line per call |
| `addSpanEvent(name, attributes?)` | Event on the active span, if any (retries, circuit changes, fallbacks) |
| `instrumentModelGateway(gateway, { logger, prices? })` | Spans `chat <model>` / `embeddings <model>` with `gen_ai.*` attributes (model, tokens, `gen_ai.usage.cost`), one `llm call` log line with tokens, duration and cost |
| `estimateCostUsd(usage, price)`, `ModelPrices` | USD from per-million-token prices keyed by `provider:model` |
| `InMemorySpanExporter`, `SpanStatusCode` | Re-exported for tests and status codes |

In `apps/api`: one span per request named by route pattern (`POST /api/v1/rag/query`,
`DELETE /api/v1/rag/documents/:id`) with `http.*` attributes and `synapse.request_id`; retrieval and
LLM spans are its children. Config: `LOG_LEVEL`, `LOG_FORMAT`, `AI_MODEL_PRICES`, and one trace
destination: `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` (+ `LANGFUSE_BASE_URL`, default EU cloud)
or `OTEL_EXPORTER_OTLP_ENDPOINT`.

**Langfuse:** the API sends spans to `<LANGFUSE_BASE_URL>/api/public/otel/v1/traces` with Basic auth
(`public:secret`) and `x-langfuse-ingestion-version: 4`. Chat spans show up as generations with
model, input/output tokens and cost (from `gen_ai.usage.cost`, so set `AI_MODEL_PRICES`).
