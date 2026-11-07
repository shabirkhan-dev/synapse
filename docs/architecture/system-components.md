# System components

> **Status:** mixed — see the Status column.

## Apps

| App | Role | Status |
| --- | --- | --- |
| `apps/api` | Hono HTTP API on Bun | Live |
| `apps/worker` | Background jobs and cron (pg-boss) | Planned |
| `apps/console` | Admin and playground (Next.js) | Live (bare) |

## Packages

See [docs/packages/](../packages/README.md). Live today: `ui`, `typescript-config`, `core`, `database`, `adapters`
(model gateway), `ingestion`, `knowledge`, `retrieval`.
Everything else is planned.

## Crates (Rust)

| Crate | Role | Status |
| --- | --- | --- |
| `bindings` | napi-rs entry point exposed to `packages/native` | Planned |
| `document-processing` | Document parsing / extraction | Planned |
| `text-processing` | Tokenizing, chunking helpers | Planned |
| `search-engine` | In-process search helpers | Planned |
| `file-processing` | File type detection and decoding | Planned |
| `shared` | Common Rust types and errors | Planned |

## Infrastructure

| Piece | Choice | Status |
| --- | --- | --- |
| Database | PostgreSQL 18 | Live |
| Vectors | pgvector (HNSW, cosine) | Live |
| Keyword search | Postgres full-text (GIN, `simple` config) | Live |
| Queue | pg-boss | Planned |
| Cache | Postgres first; Redis only if load proves it | Planned |
| Tracing | Langfuse + OpenTelemetry | Planned |
| Local stack | Docker Compose (`docker-compose.yml`) | Live |
