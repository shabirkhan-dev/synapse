---
id: syn-046
title: Console knowledge: document detail with chunks and versions, delete a document
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-045]
branch: main
worktree: none
scope: [apps/console, apps/api/src/modules/rag]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

A document page in the console: its chunks in order, each with `chunker_version` and
`embedding_model`, which ones are out of date for the current embedding model (waiting for the
worker's re-embed), and deleting one document (`DELETE /rag/documents/{id}` exists).

## Why / Context

Phase 3 "Console features: knowledge …". Today the console only lists documents; versions and
stale vectors (known constraint) are invisible.

## Proposal or Ask

API: `GET /rag/documents/{id}` with chunks (owner-scoped, paged). Console: `/documents/{id}`
(linked from the table), chunk list, version badges, delete with a confirmation naming the
document; tests, e2e, interface review.

## Scope

**In scope:**

- document detail route + page, delete one document, tests, e2e

**Out of scope:**

- editing documents, re-embedding from the console

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

Done in commit `feat(documents): document page with its chunks and versions, delete one document`.

- **API:** `GET /rag/documents/{id}` (owner = active organization; chunks ordered by index, paged `offset`/`limit` ≤ 200, no vectors; `current` versions from the knowledge preparer). Repository `findDocument` + `listChunks`, both owner-scoped.
- **Console:** `/documents/[id]` (server page awaits `params`, Next 16) linked from each title. Shows added date, chunk count, the source as a link, today's chunker and embedding model, then the chunks in order; a chunk whose embedding model differs says in words that search by meaning skips it until re-embedded (keyword search still finds it), and older chunker / pre-versioning chunks are noted the same way ("Out of date" badge + icon + text). Pages of 50 with Previous/Next and "Chunks 51–60 of 60". "Delete document…" asks first (title and chunk count), then returns to the list. Missing or other-organization documents read as "does not exist" with a way back. The sidebar marks Documents `aria-current="true"` on sub-pages (`"page"` only on the exact page).
- **Validation:** API 143 tests with Postgres (detail: order, paging, versions, other tenant 404, unknown 404, malformed 422, limit > 200 422; repository paging + owner scope on a real DB); console 71 (chunk notes, paging, delete + redirect with a mocked router, missing doc); e2e 13 incl. `documents.spec.ts`; interface pass in dark (1280px) and light (320px, no sideways scroll).
- **Not done:** re-embedding from the console, editing a document, a per-document "n chunks out of date" total.
