---
id: syn-024
title: Add apps/worker with a pg-boss queue adapter and resumable jobs
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-017]
branch: main
worktree: none
scope: [apps/worker, packages/adapters, packages/core]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Long work (ingesting large files, re-embedding, evaluations) runs inside API requests today.

## Why / Context

Architecture rule 5: every long job saves its state and can resume. ADR-0002 picks Postgres (pg-boss) for jobs.

## Proposal or Ask

A `JobQueue` contract in `core`, a pg-boss adapter in `adapters`, and `apps/worker` that runs handlers with checkpoints. First job: re-embedding chunks when the embedding model changes (known constraint).

## Scope

**In scope:**

- `apps/worker`, queue contract + adapter, first job, compose service, docs

**Out of scope:**

- LangGraph orchestration (next card)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a job killed mid-run resumes from its checkpoint (integration test on Postgres)

## Resolution

Done in commit `feat(worker): add pg-boss worker with checkpointed re-embedding and daily pruning`.

- `@synapse/core/contracts`: `JobQueue`, `QueueJob`, `QueueOptions`, `JobHandler`.
- `@synapse/adapters/queue`: `createPgBossJobQueue` on pg-boss **12.38.0** (pinned; 12.38.1 was two days old). Policies `exclusive`/`standard`, retries with backoff, expiry, UTC cron, graceful stop.
- `@synapse/knowledge`: `createReembedder` (embed batch → write → checkpoint, resumes; dimension check before writing); 3 tests.
- `@synapse/database`: `job_checkpoints` (migration `0006`).
- `apps/worker`: modules `knowledge` (re-embed job, checkpoint + chunk repositories; optional `{ ownerId }`) and `maintenance` (daily prune of auth rate limits, auth links, sessions, abandoned checkpoints). Re-embedding is enqueued on every start; `exclusive` queues dedupe.
- Architecture checks now cover `apps/worker` (env only in config, module isolation, drizzle only in repositories, no direct pg-boss/@ai-sdk/@opentelemetry); fixture test extended.
- Compose `worker` service (after the api is healthy), `apps/worker/Dockerfile`, `bun run dev:worker`, CI steps: worker tests on Postgres + boot smoke.
- **Validation:** a re-embed job that fails on its third batch leaves 4/5 chunks done and a checkpoint; the retry with the same job id makes one embedding call and finishes (Postgres integration test). Real pg-boss: delivery and the exclusive policy refusing a duplicate. Prune deletes only expired rows. Bundle boot: queues created (`exclusive`), prune scheduled `17 3 * * *`, SIGTERM stops cleanly.
- **Not verified:** `docker build` for the worker (and api) image: the sandbox's build containers have no DNS, so `bun install` cannot download. Worker has logs but no tracing yet; re-embedding has no API trigger yet.
