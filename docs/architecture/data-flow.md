# Data flow

> **Status:** Live for the current API path · Planned for the package pipeline.

## Today (`apps/api`)

**Ingest:** `POST /api/v1/rag/documents` → validate (≤ 2 MB) → normalize + content hash
(`@synapse/ingestion`) → return existing on duplicate → chunk + embed with versions
(`@synapse/knowledge`: `RAG_CHUNK_SIZE`,
`RAG_CHUNK_OVERLAP`) → embed (1536 dims) → store `rag_documents` + `rag_chunks` scoped to the
token's `sub`.

**Ask:** `POST /api/v1/rag/query` → embed query → vector search (same embedding model) + keyword
search, fused with RRF (`@synapse/retrieval`) on the owner's chunks →
(optional) answer with the chat model using the matches as context.

**Answer:** `@synapse/generation` numbers the passages within `RAG_MAX_CONTEXT_TOKENS`, calls the
chat model with the versioned `rag-answer@1` prompt, extracts `[n]` citations and returns provenance.

**Chat:** `POST /api/v1/chat` → AI SDK tool loop (`searchDocuments`, `currentTime`), streamed as
the AI SDK UI message stream (SSE).

## Target

```text
source ─▶ ingestion (connector → parse → normalize → dedup → ACL) ─▶ job checkpoints
        ─▶ knowledge (chunk → enrich → embed → index, versioned)
question ─▶ guardrails(input) ─▶ retrieval (rewrite → vector + keyword → fuse → rerank → access filter)
        ─▶ generation (context → completion → citations → structured output) ─▶ guardrails(output)
        ─▶ audit (provenance: model, prompt version, embedding version, sources)
```
