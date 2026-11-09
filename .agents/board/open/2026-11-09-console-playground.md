---
id: syn-038
title: Console playground: ask a question, see matches, citations and provenance
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-018]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

The console can add documents but not ask anything; the RAG answer path (citations, provenance,
reranker, feedback) has no UI.

## Why / Context

The first console feature users need after adding documents; it exercises the answer contract.

## Proposal or Ask

`features/playground` per the syn-018 pattern: question form → `POST /rag/query` mutation →
answer with numbered citations linked to matches (score, ranks incl. rerank), provenance (models,
prompt version), and thumbs up/down via `POST /oversight/feedback` with the request id.

## Scope

**In scope:**

- playground feature, nav entry, tests, browser check

**Out of scope:**

- streaming chat UI (later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- browser check of ask → answer → feedback

## Resolution

_Open._
