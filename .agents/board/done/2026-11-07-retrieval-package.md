---
id: syn-013
title: Create @synapse/retrieval (vector + keyword + hybrid)
type: feature
from: human
to: backend
priority: normal
status: done
assignee: claude
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

Done in commit `feat(retrieval): add hybrid retrieval with keyword search and rrf`.

- `@synapse/retrieval`: `reciprocalRankFusion`, `createRetriever` (`vector` / `hybrid`, ranks per list); 6 tests.
- `@synapse/database`: GIN index on `to_tsvector('simple', content)` (migration `0003_chunk_keyword_search`), `searchVector` / `searchQuery` helpers so queries hit the index.
- `apps/api`: `RAG_SEARCH_MODE` (default `hybrid`); repository `keywordSearch` + embedding-model filter on `searchChunks`; matches carry `ranks`.
- Verified on pgvector: keyword search (incl. `SKU-4521`), owner scoping, model filter, GIN index in the plan.
- Reranking (Cohere) stays out of scope — separate card when providers land.
