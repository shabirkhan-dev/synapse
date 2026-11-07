---
id: syn-012
title: Create @synapse/knowledge (chunking + embeddings, versioned)
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
scope: [packages/knowledge, packages/database]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Move the text chunker and embedding step into `knowledge`; record chunker and embedding versions on each chunk.

## Why / Context

Every answer must be traceable to its embedding version (architecture rule 4).

## Proposal or Ask

Package + migration adding version columns.

## Scope

**In scope:**

- `packages/knowledge/**`, `packages/database/src/schema/**`

**Out of scope:**

- enrichment, re-embedding jobs

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- migration generated and applied against pgvector

## Resolution

Done in commit `feat(knowledge): add knowledge package with versioned chunks`.

- `@synapse/knowledge`: `chunkText` (moved from apps/api with its tests), `createChunkPreparer` (chunk → one embedding batch → dimension check → versions), `chunkerVersion` / `embeddingVersion`; 10 tests.
- `@synapse/database`: `rag_chunks.chunker_version` + `embedding_model`, migration `0002_chunk_versions`.
- `apps/api`: `RagService` indexes and embeds queries via the preparer; knowledge dimension errors map to `502 RAG_EMBEDDING_DIMENSION_MISMATCH`.
- Verified on real pgvector: `0002` applies on top of `0001`, integration test reads the stored versions.
