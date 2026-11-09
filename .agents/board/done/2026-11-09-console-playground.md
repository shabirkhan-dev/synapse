---
id: syn-038
title: Console playground: ask a question, see matches, citations and provenance
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
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

Done in commit `feat(console): add the playground to ask, see sources and rate answers`.

- `features/playground`: question form (query + passage count, Ctrl/⌘ + Enter, Zod), ask mutation → `POST /rag/query` with a console-chosen `x-request-id` (`console_<uuid>`; the API keeps well-formed ids), answer panel (the question, the answer as text with `[n]` linked to its source, numbered sources, provenance incl. reranker, tokens and request id), retrieved passages (rank per search, score, excerpt), feedback buttons → `POST /oversight/feedback` with that request id (a new question starts unrated). No-documents state links to Documents; provider errors show the API's message. Nav entry.
- `lib/api` client: `headers` option. Model and document text render as React text only; sources are links only for `http(s)` URLs.
- **Validation:** 7 tests (HTML in an answer stays text and unknown markers stay unlinked; `javascript:` sources are not links; ranks and score; container: request id sent and reused for feedback, citations and provenance shown, rating state resets per question; no-documents state; 503 message; validation before any call). Browser run against the built API: no-documents message → add a document → Ctrl+Enter → cited answer, `[1]` jumps to its source, provenance, rating saved; Postgres has `answer_feedback` `up` and `audit_events` `rag.query.answered` under the same `console_…` id; 390 px without horizontal overflow; only the expected restore 401 in the console log.
- **Not done:** streaming chat UI, answer history, comments on feedback.
