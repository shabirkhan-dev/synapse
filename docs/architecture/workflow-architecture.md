# Workflow architecture

> **Status:** Live (jobs, RAG answer graph, approval-gated actions) · Planned (agent tools, escalation).

## Jobs (`apps/worker` + `adapters/queue`) — live

- pg-boss 12 on Postgres (own `pgboss` schema); no Redis. Code depends on the `JobQueue` contract
  (`@synapse/core/contracts`); only `@synapse/adapters/queue` imports pg-boss.
- Queues are created on every start with a policy, retries with backoff, and an expiry. `exclusive`
  queues hold at most one queued-or-running job, so restarts and schedules never stack duplicates.
- **Checkpoints:** long jobs save progress in `job_checkpoints` keyed by the job id, which stays the
  same across retries; a retry resumes after the last checkpoint and the row is removed on success.
  Handlers are idempotent (re-embedding filters on the embedding model, pruning deletes by age).
- Jobs today: `knowledge.reembed-chunks` (on worker start), `maintenance.prune` (daily, 03:17 UTC).
- Planned: after the retry limit, park the job for a human (`human-oversight`); reconciliation jobs.

## Agents (`orchestration`)

Live: the RAG answer graph (retrieve → generate → retry once without citations) with Postgres
checkpoints and `resume(threadId)`; see [orchestration](../packages/orchestration.md). Planned:

- LangGraph JS graphs with a Postgres checkpointer: a run can pause (approval) and resume after a
  crash or deploy.
- Tools wrap domain packages and pass through `guardrails` before side effects.
- Every step emits an audit event.

## Human in the loop (`human-oversight`)

- Approval request → review queue → decision → graph resumes.
- Escalation rules for timeouts and high-risk scores (`guardrails/risk-scoring`).
