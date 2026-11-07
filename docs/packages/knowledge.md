# `@synapse/knowledge`

Turn documents into searchable, versioned knowledge: chunks, enrichment, embeddings and indexes.

> **Status:** Planned. Seed: `text-chunker.ts` and embedding in `apps/api/src/modules/rag`.

## Internal modules

`chunking/ enrichment/ embeddings/ indexing/ metadata/ versioning/ reembedding/ deletion/`

## Owns

- Chunking strategies and versions
- Enrichment (summaries, keywords, entities)
- Embedding generation (via model-gateway contract)
- Vector and keyword indexing
- Re-embedding jobs and deletion

## Does not own

- Search and ranking (→ `retrieval`)

## Depends on

`core`, `native` (optional)

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
