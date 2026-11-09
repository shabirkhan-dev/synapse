# Reliability

How Synapse stays up when a dependency is slow or down.

> **Status:** Live (health probes, timeouts, retries, circuit breakers, chat fallback via
> [`@synapse/reliability`](../packages/reliability.md)) · Planned (idempotency keys, per-dependency
> health, streaming chat coverage).

| Concern | Today | Next |
| --- | --- | --- |
| Health | `GET /api/v1/health` (liveness), `/health/ready` (checks Postgres) | readiness for every dependency |
| Timeouts | per attempt: chat 60 s, embeddings 30 s, Resend 10 s (config) | streaming chat |
| Retries | retryable errors only (timeouts, network, 408/409/425/429, 5xx), 3 attempts, 250 ms → 4 s full jitter | honour `Retry-After` |
| Circuit breakers | per dependency (`chat`, `embeddings`, `chat-fallback`, `email`), per process: 5 failures → open 30 s → one trial | shared state across replicas |
| Fallbacks | `AI_FALLBACK_CHAT_MODEL` answers when the primary is down; provenance names it | other providers (syn-034) |
| Errors | `503 RELIABILITY_CIRCUIT_OPEN`, `504 RELIABILITY_TIMEOUT` | — |
| Observability | warn log + span event per retry, circuit change and fallback | metrics |
| Idempotency | ingest dedups by content hash; jobs keyed by id | idempotency keys |
| Recovery | job checkpoints (`job_checkpoints`), approval checkpoints (LangGraph) | — |
| Shutdown | SIGINT/SIGTERM graceful stop; worker waits for running jobs | — |
