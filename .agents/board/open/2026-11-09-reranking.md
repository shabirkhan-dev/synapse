---
id: syn-035
title: Add reranking: rerank hybrid search candidates through a reranker adapter
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-034]
branch: main
worktree: none
scope: [packages/retrieval, packages/core, packages/providers, packages/evaluation, apps/api]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

Hybrid search returns RRF-fused candidates with no second-stage ranking.

## Why / Context

Roadmap Phase 2: reranking (Cohere via adapter). Rerankers usually lift precision at small `topK`;
the retrieval eval (syn-016) can measure it.

## Proposal or Ask

`Reranker` contract in `core`, Cohere rerank behind `providers` (wrapped by `reliability`),
`retrieval` reranks the top N candidates when a reranker is configured; provenance records the
reranker model; eval compares with and without.

## Scope

**In scope:**

- contract, adapter, retrieval step, config, eval run, docs

**Out of scope:**

- query rewriting

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- retrieval tests with a fake reranker; reranker outage falls back to fused order

## Resolution

_Open._
