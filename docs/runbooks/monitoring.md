# Monitoring

> **Status:** Live for logs and traces · Placeholder — dashboards, alerts and Langfuse are not set up.

| Signal | Where | How |
| --- | --- | --- |
| Health | `GET /api/v1/health`, `/health/ready` | Docker healthchecks use them |
| Logs | stdout | JSON in production (`LOG_FORMAT`); every line has `requestId`, and `traceId`/`spanId` inside a request |
| Request traces | OTLP/HTTP collector | set `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g. `http://otel-collector:4318`); spans: `METHOD /route` → `embeddings <model>`, `chat <model>` |
| LLM usage & cost | `llm call` log lines and `gen_ai.*` span attributes | tokens, duration, `costUsd` when `AI_MODEL_PRICES` is set |

Find everything for one request: search logs for its `x-request-id`, take the `traceId`, open the
trace in your collector backend (Jaeger, Tempo, Honeycomb, Langfuse via OTLP…).

To add: dashboards, error-rate and latency alerts, queue depth (pg-boss), eval score trends.
