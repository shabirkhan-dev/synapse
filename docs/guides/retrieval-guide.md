# Retrieval guide

> **Status:** Live for vector, keyword and hybrid search · Planned for query rewriting and reranking.

| `RAG_SEARCH_MODE` | What runs | `score` |
| --- | --- | --- |
| `hybrid` (default) | pgvector cosine search **and** Postgres full-text search, fused with reciprocal rank fusion | RRF score (`1/(60+rank)` summed over lists) |
| `vector` | pgvector cosine search only | cosine similarity |

Each match also has `ranks: { vector?, keyword? }`, so you can see why it was returned. Keyword
search matches chunks with **any** of the query's words (common words like "how", "my", "the" are
ignored unless the query has nothing else), ranking chunks with more matches higher. Quotes keep a
phrase together and `-word` excludes. No stemming, so exact terms (SKUs, names) match in any language.

Only chunks embedded with the current embedding model (or legacy rows without a recorded model) are
compared in vector search.

Next steps (measure each with `evaluation/retrieval`): query rewriting, Cohere reranking on the
fused top-N, metadata filters.
