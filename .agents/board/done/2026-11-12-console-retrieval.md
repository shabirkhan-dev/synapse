---
id: syn-048
title: Console retrieval inspector: one query through hybrid, vector and keyword search
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-046]
branch: main
worktree: none
scope: [apps/console, apps/api/src/modules/rag, packages/retrieval, tests/e2e]
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

Done in commit `feat(retrieval): compare one query across hybrid, vector and keyword search`.

- **`@synapse/retrieval`:** `keyword` mode (full-text only, embeds nothing) and `retrieve({ …, mode })` to run another mode for one call; the configured mode is unchanged.
- **API:** `POST /rag/query` takes `mode` with `answer: false` (`422` with an answer, or an unknown mode); answers keep the configured pipeline.
- **Console `features/retrieval`** (`/retrieval`, sidebar "Retrieval"): query + passages per mode (validated), three requests in parallel (one failing does not hide the others), columns Hybrid / Meaning / Keywords with rank, document link, chunk, 4-line excerpt (the link leads to the full text), the score with what it means in that mode, and where the same passage ranked in the other modes ("also #2 in Meaning, #1 in Keywords" / "only in Keywords"); a note to compare ranks, not numbers.
- **Validation:** retrieval package 12 tests (+ keyword mode, per-call override); API 144 (per-request modes, 422s); console 76 (cross-ranks, columns, failed/empty column, container request bodies with one failing mode, validation); e2e 14 incl. `retrieval.spec.ts`, layout incl. `/retrieval` (7 links); review in dark 1440px and light 320px (no sideways scroll).
- **Not done:** with/without reranking side by side, saving a query as an evaluation case.
