# Retrieval guide

> **Status:** Live for vector search · Planned for hybrid search and reranking.

Today: cosine similarity over pgvector (HNSW index), scoped to the caller, top `RAG_TOP_K`.

Planned steps, in order (measure each with `evaluation/retrieval`):

1. Query rewriting.
2. Postgres full-text keyword search.
3. Hybrid search with reciprocal rank fusion.
4. Cohere reranking on the fused top-N.
5. Metadata filters and ACL-based access filtering inside the query.
