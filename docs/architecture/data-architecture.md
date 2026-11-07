# Data architecture

> **Status:** Live for RAG tables · Planned for the rest.

PostgreSQL is the single store (ADR-0002).

## Live tables (`apps/api/src/database/schema/rag.schema.ts`)

| Table | Key columns | Indexes |
| --- | --- | --- |
| `rag_documents` | `id` uuid, `owner_id`, `title`, `source`, `metadata` jsonb, `chunk_count`, timestamps | `(owner_id, created_at)` |
| `rag_chunks` | `id`, `document_id` → documents, `owner_id`, `chunk_index`, `content`, `embedding vector(1536)` | unique `(document_id, chunk_index)`, `owner_id`, HNSW `vector_cosine_ops` |

Migrations: `apps/api/src/database/migrations`, journal table `__drizzle_migrations_ai_api`.

## Planned stores (same Postgres)

| Data | Owner | Notes |
| --- | --- | --- |
| Source ACLs, ingestion job state, checkpoints | `ingestion` | |
| Chunk/embedding versions, enrichment | `knowledge` | add chunker + embedding version columns |
| Full-text index | `knowledge` / `retrieval` | `tsvector` + GIN |
| Jobs | `adapters/queue` | pg-boss schema |
| Agent checkpoints | `orchestration` | LangGraph Postgres checkpointer |
| Approvals, feedback | `human-oversight` | |
| Audit events, provenance | `audit` | append-only, retention policy |
| Memory | `memory` | |
| Cache | `adapters/cache` | Postgres table first |

> Placeholder — retention periods and backup frequency to be decided before production.
