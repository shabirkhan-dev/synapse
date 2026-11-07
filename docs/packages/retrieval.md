# `@synapse/retrieval`

Find the right knowledge for a query, safely: rewrite, search, fuse, rerank and filter.

> **Status:** Partly live: top-k cosine vector search in `apps/api`. Rest planned.

## Internal modules

`query-rewriting/ vector-search/ keyword-search/ hybrid-search/ fusion/ reranking/ filters/ access-filter/`

## Owns

- Query rewriting
- Vector search (pgvector) and keyword search (Postgres full-text)
- Hybrid search and rank fusion
- Reranking (Cohere via adapter)
- Metadata filters and the access filter

## Does not own

- Answer writing (→ `generation`)
- Index building (→ `knowledge`)

## Depends on

`core`

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
