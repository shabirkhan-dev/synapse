---
id: syn-046
title: Console knowledge: document detail with chunks and versions, delete a document
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
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

_Open._
