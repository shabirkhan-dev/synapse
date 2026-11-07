---
id: syn-021
title: Make keyword search match any query term, ranked
type: feature
from: qa
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-016]
branch: main
worktree: none
scope: [apps/api/src/modules/rag/repositories, packages/database]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Keyword search uses `websearch_to_tsquery`, which requires every term (AND). Natural-language questions rarely match all terms, so the keyword list is often empty.

## Why / Context

Found by the retrieval eval (syn-016): with hashing embeddings, hybrid MRR@3 is 0.824 vs vector-only 0.852 on `retrieval-seed@1` — keyword adds little for questions like "how do I send a parcel back".

## Proposal or Ask

Build an OR tsquery from the query terms (keeping quoted phrases / `-` exclusions), rank with `ts_rank_cd`, keep the GIN index. Done when hybrid ≥ vector on the seed eval and the baseline is updated in the same change.

## Scope

**In scope:**

- `apps/api/src/modules/rag/repositories/rag.repository.ts`, `packages/database` search helpers, eval baseline

**Out of scope:**

- stemming / language configs

## Validation

- `bun run eval:retrieval` (both modes) before/after in the PR
- pgvector integration test

## Resolution

_Open._
