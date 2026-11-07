# `@synapse/retrieval`

Find the right knowledge for a query, safely: rewrite, search, fuse, rerank and filter.

> **Status:** Live (vector, keyword, hybrid fusion, embedding-model filter, owner access filter) ·
> Planned (query rewriting, reranking, metadata filters).

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

| Export | What it does |
| --- | --- |
| `createRetriever(ports, { mode, embeddingModel, candidateMultiplier?, rrfK? })` | `retrieve({ ownerId, query, topK })` |
| `RetrievalPorts` (`embedQuery`, `vectorSearch`, `keywordSearch`), `VectorSearchRequest`, `KeywordSearchRequest` | What the caller implements (the API repository) |
| `reciprocalRankFusion(lists, key, k = 60)` | Merge ranked lists by id |

- **`vector` mode:** one vector search; `score` = cosine similarity.
- **`hybrid` mode (API default):** vector + keyword in parallel, each with `topK × 4` candidates,
  fused with RRF; `score` = RRF score (e.g. `2/61` for rank 1 in both lists).
- Every match carries `ranks: { vector?, keyword? }`.
- Vector search only compares chunks embedded with the current model (plus legacy rows without one).
- The owner filter runs inside each query.

Keyword search in the API is Postgres full-text: `to_tsvector('simple', content) @@
websearch_to_tsquery('simple', query)`, ranked by `ts_rank_cd`, on a GIN index (migration
`0003_chunk_keyword_search`). Use `searchVector` / `searchQuery` from `@synapse/database` so queries
match the index.
