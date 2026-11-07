---
id: syn-024
title: Add apps/worker with a pg-boss queue adapter and resumable jobs
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
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

_Open._
