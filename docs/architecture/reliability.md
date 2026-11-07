# Reliability

> **Status:** Partly live (health probes) · Planned (`packages/reliability`).

| Concern | Today | Target |
| --- | --- | --- |
| Health | `GET /api/v1/health` (liveness), `/health/ready` (checks Postgres) | `reliability/health` for every dependency |
| Timeouts | Provider defaults | explicit per-call timeouts |
| Retries | AI SDK defaults | `reliability/retry` with backoff + jitter, retryable errors only |
| Circuit breakers | none | per external dependency |
| Fallbacks | none | model fallback chains via `model-gateway` |
| Idempotency | none | idempotency keys for ingest and jobs |
| Recovery | stateless API | job + agent checkpoints |
| Shutdown | SIGINT/SIGTERM graceful stop | same, plus draining the worker |
