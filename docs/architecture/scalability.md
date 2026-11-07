# Scalability

> **Status:** Planned.

Start simple; add infrastructure only when measurements demand it.

| Pressure | First answer | Later, if evals/load prove it |
| --- | --- | --- |
| API traffic | Scale `apps/api` horizontally (stateless) | — |
| Background work | More `apps/worker` instances (pg-boss) | — |
| Vector search | pgvector HNSW, tuned `ef_search` | partitioning, dedicated vector store |
| Keyword search | Postgres full-text | BM25 extension / search engine |
| Cache | Postgres table | Redis |
| CPU-heavy parsing | Rust via napi-rs | separate service only with an ADR |
| DB load | connection pooling (`DATABASE_POOL_MAX`), read replicas | sharding by tenant |
