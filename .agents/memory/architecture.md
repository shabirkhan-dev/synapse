# Memory: architecture

Short, durable facts. The full picture is in `docs/architecture/`.

- Synapse is an AI platform built as a **modular monolith**: Bun + Turborepo monorepo, apps in
  `apps/`, capabilities in `packages/`, Rust in `crates/` (napi-rs, in-process).
- **Today (live):** `apps/api` (Hono, RAG + streaming tool chat on Postgres/pgvector),
  `apps/console` (bare Next.js 16), `packages/ui` (shadcn on Base UI, HugeIcons, Tailwind v4),
  `packages/typescript-config`, `packages/core` (errors, config, types, model-gateway contract),
  `packages/database` (Drizzle client, schema, migrations), `packages/adapters` (model gateway),
  `packages/ingestion` (normalize, content-hash dedup, pipeline), `packages/knowledge` (chunking,
  embedding preparation, chunk versions), `packages/retrieval` (vector, keyword, hybrid RRF), `packages/generation` (prompts, context,
  citations, provenance).
- **Planned:** `apps/worker`; packages
  `orchestration`, `human-oversight`, `audit`, `guardrails`, `memory`,
  `evaluation`, `observability`, `security`, `reliability`, `providers`, `native`; more adapters
  (vector-store, cache, queue, storage);
  `crates/*`; root `tests/` and `deploy/`.
- The RAG and chat code in `apps/api/src/modules/` is the seed that will move into
  `ingestion` / `knowledge` / `retrieval` / `generation` as those packages are created.
- One owner per capability; domain packages never import vendor SDKs.
