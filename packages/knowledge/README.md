# @synapse/knowledge

Turn documents into searchable, versioned knowledge. Depends only on `@synapse/core` contracts —
no database or model SDK. Full description: [docs/packages/knowledge.md](../../docs/packages/knowledge.md).

```ts
import { createChunkPreparer } from "@synapse/knowledge";

const knowledge = createChunkPreparer({
	embedding: gateway.embedding, // EmbeddingGateway from @synapse/core/contracts
	chunking: { size: 1000, overlap: 150 },
	dimensions: 1536,
});

const prepared = await knowledge.prepare(content); // null when there is nothing to chunk
// { chunks: [{ chunkIndex, content, embedding }], chunkerVersion, embeddingModel }
const queryVector = await knowledge.embedQuery("refund window");
```

| Module | Status |
| --- | --- |
| `chunking/` — `chunkText` (recursive paragraph/line/sentence/word splitter) | Live |
| `embeddings/` — `createChunkPreparer`, `assertEmbeddingDimensions` | Live |
| `versioning/` — `chunkerVersion`, `embeddingVersion` | Live |
| `enrichment/ indexing/ metadata/ reembedding/ deletion/` | Planned |
