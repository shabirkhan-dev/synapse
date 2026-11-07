# Workflow architecture

> **Status:** Planned.

## Jobs (`apps/worker` + `adapters/queue`)

- pg-boss on Postgres; no Redis.
- Each job type has an idempotency key and a checkpoint record (`ingestion/lifecycle`).
- A failed job retries with backoff; after the limit it is parked for a human (`human-oversight`).
- Reconciliation jobs re-sync sources and repair drift.

## Agents (`orchestration`)

- LangGraph JS graphs with a Postgres checkpointer: a run can pause (approval) and resume after a
  crash or deploy.
- Tools wrap domain packages and pass through `guardrails` before side effects.
- Every step emits an audit event.

## Human in the loop (`human-oversight`)

- Approval request → review queue → decision → graph resumes.
- Escalation rules for timeouts and high-risk scores (`guardrails/risk-scoring`).
