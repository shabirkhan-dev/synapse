---
id: syn-081
title: document permissions inside an organization
type: feature
from: human
to: all
priority: high
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [packages/database, packages/retrieval, apps/api modules rag/chat/evaluations, apps/console documents, docs]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-20
---

## What

Documents can be restricted to chosen members of an organization; owners and admins still see everything. Search and answers only use documents the asker may read, filtered before ranking.

## Why / Context

Gap review 2026-11-19 (item 5): today every member sees every document of the organization.

## Proposal or Ask

ADR-0008. A document is `organization` (default) or `restricted` with a member list; the uploader, admins and owners always read it. Listing, detail, search (vector, keyword, scoped), chat tools, evaluations and the console respect it. Done with integration tests proving a member cannot find a restricted document through any path.

## Scope

**In scope:** packages/database, packages/retrieval, apps/api modules rag/chat/evaluations, apps/console documents, docs.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

ADR-0008. Migration 0019 adds `rag_documents.access` (`organization` | `restricted`), `created_by` and
`rag_document_members`. Every document read takes a reader (`readerOf(user)`: organization, user,
`documents.read_all` for owners and admins); the repository's `readableBy` condition is in the list,
find, delete, vector and keyword queries (before ranking), and a missing reader means open documents
only. Chat's search tool, the answer graph and workspace evaluations pass the reader. New
`PUT /rag/documents/{id}/access` (adder, owners, admins; members only; audited
`rag.document.access_changed`); `access` on the three create routes; duplicate of an unreadable
document → `409 RAG_DUPLICATE_OF_RESTRICTED`; leaving a team ends that member's shares; CORS allows
PUT. Console: "Only me for now" on the add panel, a lock on restricted rows, "Who can see it" on a
document's page (team only).

Validation: API 209 pass (4 new HTTP tests: every path for a non-shared member, sharing, manage and
delete rights, duplicates, audit) incl. Postgres integration (SQL filter per reader for vector,
keyword, list, find, delete; outsider dropped; shares end on leaving); retrieval 14 pass; console 108
pass; e2e 25 pass (new: restricted, hidden from a teammate, visible to the owner, shared, then found);
security suite 14 pass; retrieval eval 0.944 (no regression); migration re-run is a no-op.
