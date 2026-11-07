---
id: syn-028
title: Add human-oversight: approvals, review queue and feedback
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-025]
branch: main
worktree: none
scope: [packages/human-oversight, apps/api/src/modules, packages/database]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Graphs cannot pause for a person, and answers cannot be rated.

## Why / Context

Architecture: approvals and feedback have one owner (`human-oversight`); LangGraph can pause with `interrupt` and resume from a checkpoint.

## Proposal or Ask

Approval requests stored in Postgres with a review queue (list, approve, reject); a graph step that pauses for approval and resumes on the decision; thumbs up/down feedback on answers (stored with provenance).

## Scope

**In scope:**

- `packages/human-oversight`, tables, API endpoints, one graph using an approval step

**Out of scope:**

- console screens (syn-018 and later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a paused graph resumes after an approval, in a new process (Postgres checkpoints)

## Resolution

_Open._
