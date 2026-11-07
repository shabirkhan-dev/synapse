# @synapse/ingestion

Bring content in: normalize it, deduplicate it, and hand it to indexing. No database or model SDK —
the caller supplies storage lookup and indexing as ports. Full description:
[docs/packages/ingestion.md](../../docs/packages/ingestion.md).

```ts
import { createIngestionPipeline } from "@synapse/ingestion";

const pipeline = createIngestionPipeline({
	findByContentHash: (ownerId, hash) => repository.findByContentHash(ownerId, hash),
	index: (document) => chunkEmbedAndStore(document), // document is normalized + hashed
});

const result = await pipeline.ingest(ownerId, { title, content, source, metadata });
// { status: "created" | "duplicate", document } | { status: "empty" }
```

| Module | Status |
| --- | --- |
| `normalization/` — `normalizeText`, `normalizeDocument` | Live |
| `deduplication/` — `contentHash` (SHA-256 of normalized content) | Live |
| `pipelines/` — `createIngestionPipeline` | Live |
| `connectors/ parsers/ extraction/ acl/ lifecycle/` | Planned |
