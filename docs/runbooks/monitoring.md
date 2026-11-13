# Monitoring

> **Status:** Live for health, logs, traces and backups · Placeholder — dashboards and alerts are not set up.

| Signal | Where | How |
| --- | --- | --- |
| Health | `GET /api/v1/health`, `/health/ready` | Docker healthchecks use them; point an external uptime check at `https://api.<domain>/api/v1/health/ready` and `https://console.<domain>` |
| System page | console → System (admins and owners), or `GET /api/v1/system/status` | database latency, circuit breakers (per API process), pg-boss jobs by state (alert on `failed`), re-embed checkpoints, chunks on an old embedding model, trace destination |
| Services | `docker compose -f deploy/compose.yml --env-file deploy/.env ps` | `api`, `console`, `postgres` healthy; `worker`, `backup`, `caddy` running |
| Backups | `… logs backup` | one `backup: wrote …` per interval; alert on `backup: FAILED` or no new file in `BACKUP_DIR` |
| Edge | `… logs caddy` | JSON access logs and certificate renewals |
| Usage & cost | console → Usage | answers, tokens and estimated cost per day and model |
| Logs | stdout | JSON in production (`LOG_FORMAT`); every line has `requestId`, and `traceId`/`spanId` inside a request |
| Request traces | OTLP/HTTP collector | set `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g. `http://otel-collector:4318`); spans: `METHOD /route` → `embeddings <model>`, `chat <model>` |
| LLM usage & cost | `llm call` log lines and `gen_ai.*` span attributes | tokens, duration, `costUsd` when `AI_MODEL_PRICES` is set |

Find everything for one request: search logs for its `x-request-id`, take the `traceId`, open the
trace in your collector backend (Jaeger, Tempo, Honeycomb, Langfuse via OTLP…).

Container logs rotate at 10 MB × 5 files per service (`deploy/compose.yml`). Watch disk on the
host: the Postgres volume, `BACKUP_DIR` and Docker images.

To add: dashboards, error-rate and latency alerts, queue depth (pg-boss), eval score trends.
