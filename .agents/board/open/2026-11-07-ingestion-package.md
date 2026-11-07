---
id: syn-011
title: Create @synapse/ingestion and move document ingest into it
type: feature
from: human
to: backend
priority: normal
status: open
assignee: none
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

_Open._
