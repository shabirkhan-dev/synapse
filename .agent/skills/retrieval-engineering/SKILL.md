---
name: retrieval-engineering
description: Use when changing query rewriting, vector or keyword search, hybrid search, fusion, reranking, filters or access filtering.
---

# retrieval-engineering

> Status: Partly live: top-k cosine vector search (pgvector HNSW) in `apps/api`. Keyword, hybrid, fusion and reranking are planned.

## When to use

Search quality, latency, or access-control behaviour of retrieval changes.

## Workflow

1. Vector search uses pgvector with the HNSW index and `vector_cosine_ops`.
2. Keyword search uses Postgres full-text first; move to BM25 only if evals show a need.
3. Hybrid = run both, fuse with reciprocal rank fusion (`retrieval/fusion`).
4. Reranking (Cohere, behind an adapter) runs on the fused top-N.
5. `retrieval/access-filter` runs inside the query (owner/ACL predicates), not as a post-filter on results.
6. Measure recall@k / MRR in `evaluation/retrieval` for every change.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agent/rules/documentation.md`
- Retrieval eval metrics reported in the PR

## References

- `docs/packages/retrieval.md`
- `docs/guides/retrieval-guide.md`
