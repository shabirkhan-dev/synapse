---
id: syn-025
title: Add the orchestration package (LangGraph graphs with checkpoints)
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-024]
branch: main
worktree: none
scope: [packages/orchestration, packages/adapters]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Multi-step agent flows (tool use, retries, human approval) have no home; streaming chat loops tools inline.

## Why / Context

One owner per capability: LangGraph lives in `orchestration`, checkpoints in Postgres.

## Proposal or Ask

`@synapse/orchestration` with graph state, routing and Postgres checkpoints; first graph: RAG answer with a retry on missing citations.

## Scope

**In scope:**

- `packages/orchestration`, checkpoint storage, docs

**Out of scope:**

- human-oversight approvals (own card later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a graph resumes from its last checkpoint after a simulated crash

## Resolution

_Open._
