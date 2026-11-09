# Memory: architecture

Short, durable facts. The full picture is in `docs/architecture/`.

- Synapse is an AI platform built as a **modular monolith**: Bun + Turborepo monorepo, apps in
  `apps/`, capabilities in `packages/`, Rust in `crates/` (napi-rs, in-process).
- **Today (live):** `apps/api` (Hono, RAG + streaming tool chat on Postgres/pgvector),
  `apps/worker` (pg-boss jobs: re-embedding with checkpoints, daily pruning),
  `apps/console` (bare Next.js 16), `packages/ui` (shadcn on Base UI, HugeIcons, Tailwind v4),
  `packages/typescript-config`, `packages/core` (errors, config, types, model-gateway contract),
  `packages/database` (Drizzle client, schema, migrations), `packages/adapters` (model gateway),
  `packages/ingestion` (normalize, content-hash dedup, pipeline), `packages/knowledge` (chunking,
  embedding preparation, chunk versions), `packages/retrieval` (vector, keyword, hybrid RRF), `packages/generation` (prompts, context,
  citations, provenance), `packages/observability` (logs, tracing, LLM usage/cost), `packages/evaluation` (retrieval evals,
  baselines), `packages/security` (authentication, roles/permissions, PII redaction),
  `packages/orchestration` (LangGraph RAG answer graph, approval-gated graph, Postgres checkpoints),
  `packages/human-oversight` (approvals, review queue, answer feedback),
  `packages/audit` (append-only events, answer provenance; PII redacted by `security`),
  `packages/memory` (conversation history within a budget, long-term facts by similarity),
  `packages/guardrails` (input policy, prompt-injection defense, tool allowlist, output checks).
- **Planned:** packages
  `reliability`, `providers`, `native`; more adapters
  (vector-store, cache, storage);
  `crates/*`; root `tests/` and `deploy/`.
- `apps/api/src/modules/rag` composes ingestion → knowledge → retrieval → generation; Phase 1 of the
  roadmap (core RAG path) is complete.
- One owner per capability; domain packages never import vendor SDKs.
