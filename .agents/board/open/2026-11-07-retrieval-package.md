---
id: syn-013
title: Create @synapse/retrieval (vector + keyword + hybrid)
type: feature
from: human
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-012]
branch: main
worktree: none
scope: [packages/retrieval]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Move vector search into `retrieval`; add Postgres full-text keyword search and reciprocal-rank fusion.

## Why / Context

Hybrid search is the next quality step after vector-only.

## Proposal or Ask

Vector search parity first, then keyword + fusion behind evals.

## Scope

**In scope:**

- `packages/retrieval/**`

**Out of scope:**

- reranking (Cohere) — separate card

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

_Open._
