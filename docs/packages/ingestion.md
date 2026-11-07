# `@synapse/ingestion`

Bring content in from sources and turn it into normalized, deduplicated documents with their access rules.

> **Status:** Planned. Seed: `POST /api/v1/rag/documents` in `apps/api`.

## Internal modules

`connectors/ parsers/ extraction/ normalization/ deduplication/ acl/ pipelines/ lifecycle/`

## Owns

- Source connectors and file parsers
- Text/structure extraction and normalization
- Content-hash deduplication
- Capturing source ACLs
- Pipelines and job lifecycle (state, checkpoints, reconciliation)

## Does not own

- Chunking and embeddings (→ `knowledge`)
- Job queue implementation (→ `adapters/queue`)

## Depends on

`core`, `native` (optional, for heavy parsing)

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
