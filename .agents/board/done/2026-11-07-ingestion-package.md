---
id: syn-011
title: Create @synapse/ingestion and move document ingest into it
type: feature
from: human
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-010]
branch: main
worktree: none
scope: [packages/ingestion]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Ingestion package (normalization, deduplication, pipeline); the API ingest route calls it.

## Why / Context

Next in the build order; ingest logic currently lives in `apps/api/src/modules/rag`.

## Proposal or Ask

Plain-text ingest with content-hash dedup first; connectors and parsers later.

## Scope

**In scope:**

- `packages/ingestion/**`, the rag module's ingest path

**Out of scope:**

- file parsers, connectors, jobs (worker)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

Done in commit `feat(ingestion): add ingestion package with normalization and dedup`.

- `@synapse/ingestion`: `normalizeDocument`, `contentHash` (SHA-256), `createIngestionPipeline` returning `created | duplicate | empty`; 8 tests.
- `@synapse/database`: `content_hash` column + unique `(owner_id, content_hash)`, migration `0001_document_content_hash`; runner now uses `import.meta.url` so drizzle-kit (Node) can load it.
- `apps/api`: `RagService.ingest` runs the pipeline; `POST /rag/documents` returns `201` new / `200` duplicate (no re-embedding); repository `findByContentHash` + conflict-safe insert.
- Verified against real Postgres + pgvector: migrations apply (and re-apply as a no-op), integration tests incl. the race path pass.
