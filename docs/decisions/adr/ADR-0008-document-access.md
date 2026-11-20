# ADR-0008: Documents can be restricted to chosen members of an organization

- Status: Accepted
- Date: 2026-11-20

## Context

ADR-0006 made organizations the tenants: every member reads every document of the active
organization. Teams keep material only some people may read (pay, HR, legal, customer contracts).
A RAG system leaks through more than the document list: search, cited passages, chat tool results
and evaluation answers all read chunks. A per-document rule must therefore hold in the database
queries that rank chunks, not in the console or after ranking.

## Decision

- `rag_documents.access` is `organization` (default; every member, as before) or `restricted`.
  `rag_documents.created_by` records who added it. `rag_document_members(document_id, user_id)`
  lists who a restricted document is shared with (migration 0019).
- A restricted document is read by: whoever added it, the members it is shared with, and owners
  and admins (new permission `documents.read_all`). Owners and admins must be able to see, audit
  and delete everything their organization holds.
- Every read is made by a **reader** (`{ ownerId, userId, readsAll }`, `readerOf(user)` in the API).
  The repository adds one condition (`readableBy`) to every query that reads documents or chunks:
  the list, a document, deleting one, vector search and keyword search (inside the query, before
  ranking, like the owner filter). The answer graph, chat's search tool and workspace evaluations
  pass the reader through. **No reader means open documents only**, never everything: a path that
  forgets the reader cannot reach a restricted document. Scripts and approved actions use a reader
  with no user and `readsAll` (typed so that only `readsAll: true` may omit the user).
- Only the adder, owners and admins change who reads a document (`PUT /rag/documents/{id}/access`)
  or delete a restricted one. Anyone else gets `404` for a document they cannot read (no hint it
  exists) and `403` only for one they can read but not manage. Shares are kept for organization
  members only, and end when the member leaves (rejoining does not restore them).
- Dedup stays per organization by content: adding text that already exists only in a document the
  caller cannot read returns `409 RAG_DUPLICATE_OF_RESTRICTED` (no title, no id). It reveals that
  the text exists, which the caller already has.
- Changes are audited as `rag.document.access_changed`.

## Consequences

- Restricted documents are invisible to other members in every API path; the Postgres integration
  test checks vector, keyword, list, find and delete per reader.
- Vector search gains an `or … exists(…)` on the joined document for non-admin readers. The HNSW
  iterative scan (syn-022) keeps filling the limit; very many restricted documents would make a
  member's scan read further. No index on access yet.
- Audit events of a restricted document (title in `rag.document.ingested`) are visible to its adder
  and to admins, who may read it anyway (members only see their own events).
- Not covered: sharing with groups, per-chunk or per-field rules, access inherited from a source
  system (connectors), and personal organizations (one user, nothing to share).
