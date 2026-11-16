# `@synapse/knowledge`

Turn documents into searchable, versioned knowledge: chunks, enrichment, embeddings and indexes.

> **Status:** Live (chunking, embeddings, versioning) · Planned (enrichment, indexing, metadata,
> re-embedding, deletion).

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

| Export | What it does |
| --- | --- |
| `chunkText(text, { size, overlap })`, `ChunkOptions` | Deterministic recursive splitter (paragraph → line → sentence → word → hard split) |
| `chunkDocument(text, options)`, `splitSections`, `chunkContext(title, headings)`, `chunkEmbeddingText(context, content)` | Chunker text-v2: chunks never cross a Markdown section (fenced code is not a heading) and carry their heading path; each chunk's context line is `Title › headings` (a first heading that repeats the title is dropped). The preparer embeds `context + "\n\n" + content` and returns `context` for storage; the re-embedder embeds the same text. Text without headings chunks exactly as before. |
| `createChunkPreparer({ embedding, chunking, dimensions })`, `PreparedChunks` | `prepare(content)` → chunks + vectors + versions (one embedding batch); `embedQuery(query)` |
| `chunkerVersion(options)`, `embeddingVersion(modelInfo)`, `TEXT_CHUNKER_ALGORITHM` | Version strings stored on every chunk: `text-v2;size=1000;overlap=150`, `openrouter:openai/text-embedding-3-small` |
| `assertEmbeddingDimensions`, `KNOWLEDGE_ERROR_CODES` | Throws `KNOWLEDGE_EMBEDDING_DIMENSION_MISMATCH` (`SynapseError`) |
| `createReembedder({ embedding, ports, dimensions, batchSize })`, `ReembedPorts`, `ReembedCheckpoint` | Re-embed chunks from another embedding model in id order: embed a batch → write it → checkpoint → next; resumes from the checkpoint. Storage is the caller's (`apps/worker`) |

Used by `apps/api` (`RagService`); the API maps the dimension error to `502 RAG_EMBEDDING_DIMENSION_MISMATCH`.
