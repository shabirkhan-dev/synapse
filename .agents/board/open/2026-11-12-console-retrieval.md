---
id: syn-048
title: Console retrieval inspector: one query through hybrid, vector and keyword search
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-046]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

A Retrieval page: type a query, see the passages each mode returns (hybrid RRF, vector cosine,
keyword) side by side with their ranks (`ranks.vector`, `ranks.keyword`, `ranks.rerank`), linking
to the document page.

## Why / Context

Phase 3 "Console features: … retrieval". Search quality is only visible through answers today;
known constraint: hybrid scores are RRF, not comparable with cosine.

## Proposal or Ask

Use `POST /rag/query` with `answer: false` (check whether a per-request `mode` exists; add it if
not, API-side, with tests). Console feature `retrieval`, tests, e2e, interface review.

## Scope

**In scope:**

- retrieval page, per-request search mode if missing, tests, e2e

**Out of scope:**

- editing ranking settings, evaluation runs (later card)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

_Open._
