# Monitoring

> **Status:** Placeholder — observability (Langfuse + OpenTelemetry) is planned.

Available today:

- Liveness `GET /api/v1/health`, readiness `GET /api/v1/health/ready` (Docker healthchecks use them).
- Request logs: `METHOD path status ms requestId` from `apps/api`.

To add: traces, LLM token/cost dashboards, error-rate and latency alerts, queue depth (pg-boss),
eval score trends.
