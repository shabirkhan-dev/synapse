---
id: syn-035
title: Add reranking: rerank hybrid search candidates through a reranker adapter
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-034]
branch: main
worktree: none
scope: [packages/retrieval, packages/core, packages/providers, packages/evaluation, apps/api]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

Hybrid search returns RRF-fused candidates with no second-stage ranking.

## Why / Context

Roadmap Phase 2: reranking (Cohere via adapter). Rerankers usually lift precision at small `topK`;
the retrieval eval (syn-016) can measure it.

## Proposal or Ask

`Reranker` contract in `core`, Cohere rerank behind `providers` (wrapped by `reliability`),
`retrieval` reranks the top N candidates when a reranker is configured; provenance records the
reranker model; eval compares with and without.

## Scope

**In scope:**

- contract, adapter, retrieval step, config, eval run, docs

**Out of scope:**

- query rewriting

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- retrieval tests with a fake reranker; reranker outage falls back to fused order

## Resolution

Done in commit `feat(retrieval): rerank search results with an optional cohere reranker`.

- `core`: `Reranker` contract (`rerank({ query, documents, topN })` → `{ index, score }[]`); `AnswerProvenance.reranker`.
- `providers`: `createRerankingModel` (Cohere `/v2/rerank`), `RERANK_PROVIDERS`, `resolveRerankingModelSpec`. `adapters`: `createReranker` / `createAiSdkReranker` (one attempt) and the offline `createTermOverlapReranker` for evaluations. `observability`: `instrumentReranker` (span `rerank <model>` + log line).
- `retrieval`: optional `rerank` step — first stage fetches `max(topK, candidates)`, the reranker returns `topK` with its score and `ranks.rerank`; a failure calls `onError` and returns the first-stage order without `ranks.rerank`. `retrieval` now depends on `core` (as documented).
- api: `AI_RERANK_PROVIDER` (off by default), `AI_RERANK_MODEL` (`rerank-v3.5`), `AI_RERANK_TIMEOUT_MS` (5000), `RAG_RERANK_CANDIDATES` (20); one attempt behind a `rerank` breaker; production needs the key. Provenance (response + audit) names the reranker only when it ordered the passages. Applies to `/rag/query` and the chat search tool.
- eval: `EVAL_RERANKER=term-overlap|cohere` searches the same ingested cases with and without the reranker, prints both, gates the reranked run against its own baseline and fails on any reranker error. CI runs the offline variant as a second step; baseline committed (recall@3 0.944, MRR 0.944 — same as fused; q07 reorders below the top hit).
- **Validation:** 4 retrieval tests (reorder with reranker score and kept first-stage ranks, vector-mode candidate count, failure fallback, no call when empty); Cohere rerank request/response with a fake fetch; offline reranker scoring; vendor reranker mapping; instrumentation span; 3 API flow tests (reorder + provenance + audit, failing reranker still answers in fused order without claiming it, unchanged without one); 2 config tests (off by default, production key). Real-server smoke (built bundle, `AI_RERANK_PROVIDER=cohere` with a fake key): the request reached Cohere, which answered 401; every query still returned 200 in fused order without `provenance.reranker`, one warn log per query, 0 errors (a 401 is not an outage, so the breaker stays closed). Docs: the evaluation page's stale baseline numbers corrected.
- **Not done:** measuring Cohere on the dataset (needs `COHERE_API_KEY`: `EVAL_RERANKER=cohere bun run eval:retrieval`), other rerank vendors, query rewriting.
