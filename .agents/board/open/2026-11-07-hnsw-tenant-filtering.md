---
id: syn-022
title: Keep owner-filtered vector search complete with HNSW
type: risk
from: qa
to: backend
priority: high
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

pgvector's HNSW scan returns the nearest candidates across all owners (default `hnsw.ef_search = 40`), then the owner filter drops other tenants' rows. With many tenants, a user can get fewer than `topK` results or miss their best chunks.

## Why / Context

Multi-tenant correctness. Observed while making the eval deterministic (syn-016).

## Proposal or Ask

pgvector ≥ 0.8 (compose and CI use 0.8.7): `SET LOCAL hnsw.iterative_scan = relaxed_order` (and a sane `hnsw.max_scan_tuples`) inside the search transaction, then re-sort; or partial indexes / partitioning per tenant at scale. Add a test with many owners proving the user still gets `topK` results.

## Scope

**In scope:**

- vector search query and its transaction, docs

**Out of scope:**

- sharding

## Validation

- integration test with ≥ 1,000 rows across owners where one owner has few rows
- `bun run eval:retrieval` unchanged

## Resolution

_Open._
