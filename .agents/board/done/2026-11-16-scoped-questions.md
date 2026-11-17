---
id: syn-070
title: rag: ask about chosen documents (Playground, chat, API filter)
type: feature
from: reviewer
to: backend
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: []
allowed_shared: []
created: 2026-11-16
updated: 2026-11-17
---

## What

Every question searches the whole workspace; there is no way to ask about one document or a few
(Onyx assistants and Perplexity focus modes scope knowledge; RAGFlow datasets do the same).

## Why / Context

Phase 5 review (`.agents/plans/phase-5-rag-quality.md`), step 4.

## Proposal or Ask

`documentIds` filter on `/rag/query` (and the chat search tool), applied in both vector and keyword
search before ranking, owner-scoped; Playground document picker; "Ask about this document" on the
document page.

## Scope

**In scope:** API filter, Playground picker, document-page shortcut. **Out of scope:** saved
collections.

## Validation

Postgres: filtered searches return only chosen documents and never another owner's; e2e for the
document-page shortcut.

## Resolution

Landed in `feat(rag): ask about chosen documents` (on `main`).

- `@synapse/retrieval`: `retrieve({ …, documentIds })` passes a `DocumentScope` to both ports in
  every mode; an empty list is no scope.
- API: `documentIds` (1–20 uuids, `RAG_MAX_SCOPE_DOCUMENTS`) on `POST /rag/query` and `POST /chat`
  (every `searchDocuments` call of the turn); the repository filters `document_id` inside the owner-
  scoped vector and keyword queries, before ranking; audit records `scopedToDocumentIds`. A scoped
  vector search sets `enable_indexscan = off` so it is always exact.
- Console: "Search in" picker on the Playground (checkboxes, at most 20, "Search all documents"),
  the answer says "Searched N chosen document(s) only."; "Ask about this document" on the document
  page opens `/playground?d=<id>` with it chosen. Retrieved passages list is labelled.
- Not done: no picker in the chat page yet (the API accepts `documentIds`); saved collections out
  of scope.

Validation: API 192 pass with Postgres (new: scope in every mode, another owner's id finds nothing,
422 for `[]`, non-uuid, 21 ids; chat turn scoped and audited; integration: 300-chunk crowd plus the
chosen document, `enable_sort=off`, keyword scope, other owner → `[]`). The integration test also
passes without the `enable_indexscan` line: Postgres already chose filter-then-sort; the line is kept
so a larger scope can never take the HNSW plan. Retrieval 13 pass; console 96 pass; e2e 21 pass
(new: "asking about one document searches only that document"). Screenshots light and dark checked.
