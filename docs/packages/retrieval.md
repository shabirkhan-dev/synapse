# `@synapse/retrieval`

Find the right knowledge for a query, safely: rewrite, search, fuse, rerank and filter.

> **Status:** Live (vector, keyword, hybrid fusion, reranking, embedding-model filter, owner access
> filter) · Planned (query rewriting, metadata filters).

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
| `createRetriever(ports, { mode, embeddingModel, candidateMultiplier?, rrfK?, rerank? })` | `retrieve({ ownerId, query, topK })`; `reranker` = `provider:model` or `null` |
| `RerankOptions` (`reranker`, `text(match)`, `candidates`, `onError?`) | Second stage: the best `candidates` first-stage matches go to a `Reranker` (`@synapse/core/contracts`) |
| `RetrievalPorts` (`embedQuery`, `vectorSearch`, `keywordSearch`), `VectorSearchRequest`, `KeywordSearchRequest` | What the caller implements (the API repository) |
| `reciprocalRankFusion(lists, key, k = 60)` | Merge ranked lists by id |

- **`vector` mode:** one vector search; `score` = cosine similarity.
- **`hybrid` mode (API default):** vector + keyword in parallel, each with `topK × 4` candidates,
  fused with RRF; `score` = RRF score (e.g. `2/61` for rank 1 in both lists).
- Every match carries `ranks: { vector?, keyword?, rerank? }`.
- **Reranking (optional):** the first stage fetches `max(topK, candidates)` matches (hybrid
  over-fetches `max(topK × 4, candidates)` per list), the reranker returns the best `topK`; `score`
  becomes the reranker's relevance and `ranks.rerank` is set. If the reranker throws, `onError` is
  called and the first-stage order is returned without `ranks.rerank`, so callers can tell.
- Vector search only compares chunks embedded with the current model (plus legacy rows without one).
- The owner filter runs inside each query. Vector search sets `hnsw.iterative_scan = relaxed_order`
  for its transaction (pgvector ≥ 0.8), so HNSW keeps scanning past other tenants' rows until `topK`
  is filled (up to `hnsw.max_scan_tuples`); the relaxed order is re-sorted in memory.
- Results are deterministic: equal scores are tie-broken by content (vector: in memory, so the SQL
  keeps the HNSW-friendly `ORDER BY distance`; keyword: in SQL).

Keyword search in the API is Postgres full-text on a GIN index (migration
`0003_chunk_keyword_search`), ranked by `ts_rank_cd`. `searchQuery` (`@synapse/database`) matches
chunks containing **any** query term: it drops common English words from the query (the `simple`
index keeps them, so they would match everything), ORs the rest, keeps quoted phrases, and ANDs
`-term` exclusions (`websearch_to_tsquery(any) && !!websearch_to_tsquery(excluded)`). Use
`searchVector` / `searchQuery` so queries match the index.
