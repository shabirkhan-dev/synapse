---
name: knowledge-engineering
description: Use when working on chunking, enrichment, embeddings, indexing, metadata, versioning, re-embedding or deletion of knowledge.
---

# knowledge-engineering

> Status: Partly live. `@synapse/knowledge`: chunking, `createChunkPreparer` (embed + dimension check),
> versions stored on `rag_chunks` (`chunker_version`, `embedding_model`). Enrichment and re-embedding are planned.

## When to use

Changing how documents become searchable units, or how those units are versioned, re-embedded or removed.

## Workflow

1. Chunking is deterministic for the same input and settings; record the chunker version and settings with each chunk.
2. Record the embedding model and version on every vector; never mix embedding models in one index.
3. Changing the embedding model = a re-embedding job (`knowledge/reembedding`), not an in-place update.
4. Deletion removes chunks, vectors and keyword-index entries together, and writes an audit event.
5. Enrichment (summaries, keywords, entities) is optional, versioned, and never blocks indexing.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`
- Every chunk row records chunker + embedding versions
- Deleting a document leaves no orphan chunks

## References

- `docs/packages/knowledge.md`
- `docs/architecture/data-architecture.md`
