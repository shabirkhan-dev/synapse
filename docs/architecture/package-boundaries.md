# Package boundaries

> **Status:** Live (rules) · Planned (packages).

Each capability has **one owner**. If you need it elsewhere, depend on the owner — never copy it.

| Capability | Owner |
| --- | --- |
| Domain types, contracts, errors, events, config | `core` |
| Connectors, parsing, dedup, ACL capture, ingestion jobs | `ingestion` |
| Chunking, embeddings, indexing, re-embedding, deletion | `knowledge` |
| Search, fusion, reranking, access filter | `retrieval` |
| Prompts, context, completion, citations, structured output | `generation` |
| LangGraph graphs, agent state, checkpoints | `orchestration` |
| Approvals, review queues, feedback | `human-oversight` |
| Event history and provenance | `audit` |
| Input/output/tool policies, injection defense | `guardrails` |
| Agent and conversation memory | `memory` |
| Datasets, scorers, regression | `evaluation` |
| Tracing, cost, exporters | `observability` |
| Auth, tenancy, permissions, PII, secrets | `security` |
| Retry, breakers, idempotency, timeouts, fallbacks, health | `reliability` |
| Postgres client, schema, migrations | `database` |
| Domain queries (repositories) | the module that owns the data |
| Vector store, cache, queue, storage, model gateway | `adapters` |
| Vendor SDKs (OpenAI, Anthropic, Google, Cohere, Langfuse) | `providers` |
| Rust bridge | `native` (+ `crates/`) |
| UI primitives | `ui` |

Enforcement today: `bun run architecture:check` (packages may not import app aliases; no
cross-app relative imports). Package-to-package rules will be added to
`scripts/architecture/check-boundaries.sh` as packages land.
