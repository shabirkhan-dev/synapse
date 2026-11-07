---
id: syn-022
title: Keep owner-filtered vector search complete with HNSW
type: risk
from: qa
to: backend
priority: high
status: done
assignee: claude
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

Done in commit `fix(rag): keep per-tenant vector search complete with hnsw iterative scans`.

- `searchChunks` runs in a transaction with `set local hnsw.iterative_scan = relaxed_order`; results were already re-sorted in memory, so relaxed order is safe. Requires pgvector ≥ 0.8 (compose and CI: 0.8.7; documented in ADR-0002).
- Finding: Postgres only picks the HNSW plan when an owner holds a large share of rows; small owners get an exact owner-index scan. The test forces the HNSW plan (`enable_sort=off` startup parameter on its own connection) with dense vectors: 300 crowd rows (> `ef_search` 40) + 3 tenant rows. Without the fix the tenant gets 0 of 3 rows; with it, 3 of 3.
- Limits recorded in memory: `hnsw.max_scan_tuples` (20,000), and near-orthogonal outliers HNSW keeps no links to stay unreachable (seen with sparse test vectors).
- Validation: the integration test above, the full api suite, and `bun run eval:retrieval` unchanged (recall 0.944, MRR 0.944). Deviation from the card: 300 + 3 rows instead of ≥ 1,000, enough to exceed `ef_search` and fast enough for the default test run.
