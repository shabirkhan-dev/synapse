# System overview

> **Status:** Live (principles) · Planned (most components).

Synapse is a **modular monolith**: one repository, a few deployables, many internal packages.

```text
             ┌──────────── apps ────────────┐
 console ──▶ │  api (Hono)      worker (jobs)│
             └──────┬───────────────┬───────┘
                    ▼               ▼
   ingestion → knowledge → retrieval → generation      orchestration (LangGraph)
        human-oversight · audit · guardrails · memory · evaluation
        observability · security · reliability
                    │  contracts from core
                    ▼
        adapters (db, vector, cache, queue, storage, model-gateway) · providers (LLM vendors)
                    │
                    ▼
        PostgreSQL (+ pgvector, full-text, pg-boss)     native ─▶ crates (Rust, napi-rs)
```

## Principles

1. One owner per capability.
2. Domain packages never import vendor SDKs; only `adapters` and `providers` do.
3. Every long job saves its state and can resume.
4. Every answer records the model, prompt version and embedding version that produced it.

## What runs today

- `apps/api`: document ingest (plain text), chunk + embed into pgvector, top-k search, RAG answer,
  and streaming tool-calling chat. HS256 JWT auth.
- `apps/console`: a bare Next.js app.
- Postgres 18 + pgvector via Docker Compose.

See [system-components.md](system-components.md) for the full list and status.
