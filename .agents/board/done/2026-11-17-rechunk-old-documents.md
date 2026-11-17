---
id: syn-077
title: worker: re-chunk documents written before text-v2 or without saved context
type: feature
from: reviewer
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: []
allowed_shared: []
created: 2026-11-17
updated: 2026-11-17
---

## What

Chunks from text-v1, and text-v2 chunks written before syn-074 (context never saved), miss the heading context in the keyword index, the document page and (text-v1) the embeddings. Only re-adding a document upgrades it.

## Why / Context

Phase 5 follow-up (roadmap rows after syn-075).

## Proposal or Ask

A resumable worker job (like re-embedding) that re-chunks such documents from their stored text with the current chunker and swaps the chunks in one transaction per document; runs on worker start.

## Scope

**In scope:** the above. **Out of scope:** anything else.

## Validation

Integration test with Postgres: old chunks replaced, context saved, idempotent, resumes from its checkpoint.

## Resolution

Landed in `feat(worker): re-chunk documents written before text-v2` (on `main`).

- `@synapse/knowledge`: `reassembleChunks` (drops the repeated overlap; checked to give back the
  original text, whitespace aside, at 1000/150, 300/60 and 200/0) and `createRechunker` (per-document
  checkpoint, idempotent).
- Worker: `knowledge.rechunk-documents` queue (exclusive, 5 retries, sent on start with the
  re-embed job when an embedding key is set), `DrizzleRechunkRepository` (documents with any
  pre-v2 chunk; swap in one transaction with the document row locked; chunk count updated),
  `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` read like the api.
- **Not covered:** text-v2 chunks saved without context between syn-068 and syn-074 lost their
  headings from the content, so they cannot be rebuilt; re-adding such a document is the fix (only
  development data: nothing is deployed).

Validation: knowledge 4 new (reassembly, crash and resume, idle second run); worker integration with
Postgres (two old documents re-chunked with heading context and counts, a crash on the second
resumes from the checkpoint, a current document untouched, a second run makes no embedding call).
