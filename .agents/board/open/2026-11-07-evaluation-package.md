---
id: syn-016
title: Create @synapse/evaluation with a first retrieval dataset
type: feature
from: human
to: qa
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-013]
branch: main
worktree: none
scope: [packages/evaluation]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Datasets + recall@k/MRR scoring + a regression run in CI.

## Why / Context

Retrieval and prompt changes must be measured, not guessed.

## Proposal or Ask

Small seed dataset, scorer, CI job.

## Scope

**In scope:**

- `packages/evaluation/**`, `.github/workflows/ci.yml`

**Out of scope:**

- generation and agent evals

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

_Open._
