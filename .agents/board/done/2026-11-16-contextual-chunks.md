---
id: syn-068
title: knowledge: chunks carry their document title and heading path
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
scope: [packages/knowledge, packages/database, apps/api, apps/worker, apps/console, docs]
allowed_shared: []
created: 2026-11-16
updated: 2026-11-16
---

## What

A chunk under a heading like Exceptions does not say which document or section it is from, so search misses it (Anthropic: context prepended to chunks cuts retrieval failures 35-49%).

## Why / Context

Phase 5 review (`.agents/plans/phase-5-rag-quality.md`), asked by the human: "keep improving the UI/UX
and make it the ultimate RAG system".

## Proposal or Ask

Chunker v2 tracks Markdown heading paths; embed and keyword-index 'title > heading path' plus the text; compare with the retrieval baseline; re-embedding via the worker.

## Scope

See the plan; one card per commit.

## Validation

- knowledge: sections never cross, nested heading paths, fenced `#` is not a heading, text without
  headings chunks exactly like v1; context drops a heading that repeats the title; the embedded text
  is `context\n\ncontent`; the re-embedder embeds the same
- integration (Postgres): a chunk is found by words only in its context; the plan uses
  `rag_chunks_search_idx`
- retrieval eval (seed set, hashing embeddings): 0.944 recall@3 and MRR before and after, with and
  without the reranker — no regression and no gain on short documents without headings
- api 158 + 31 integration, console, e2e 19 pass

## Resolution

Landed in the `feat(knowledge)` commit on `main`. `chunkDocument`, `chunkContext`, `chunkEmbeddingText`
(`@synapse/knowledge`), chunker `text-v2`; `rag_chunks.context` + `rag_chunks_search_idx` (migration 0018,
expand then contract); repository, chat tool and console (passage popover, retrieved passages,
retrieval inspector, document page) show the section. Follow-up: re-chunk old documents (worker job or
a "re-index" action), and eval cases with long sectioned documents.
