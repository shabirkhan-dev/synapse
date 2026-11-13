# Memory: architecture

Short, durable facts. The full picture is in `docs/architecture/`.

- Synapse is an AI platform built as a **modular monolith**: Bun + Turborepo monorepo, apps in
  `apps/`, capabilities in `packages/`, Rust in `crates/` (napi-rs, in-process).
- **Today (live):** `apps/api` (Hono, RAG + streaming tool chat on Postgres/pgvector),
  `apps/worker` (pg-boss jobs: re-embedding with checkpoints, daily pruning),
  `apps/console` (Next.js 16 on `@synapse/ui` + TanStack Query: sign-in/up, verify email, password reset, documents list/add/upload (txt, md, pdf)/detail with chunks/delete, playground, retrieval inspector, evaluations, agents (configuration and recent runs), usage, streaming chat with stored conversations, approvals, activity, team switcher and members, account with devices), `packages/ui` (shadcn on Base UI, HugeIcons, Tailwind v4),
  `packages/typescript-config`, `packages/core` (errors, config, types, model-gateway contract),
  `packages/database` (Drizzle client, schema, migrations), `packages/adapters` (model gateway),
  `packages/ingestion` (normalize, content-hash dedup, pipeline, file text extraction), `packages/knowledge` (chunking,
  embedding preparation, chunk versions), `packages/retrieval` (vector, keyword, hybrid RRF; per-call mode), `packages/generation` (prompts, context,
  citations, provenance), `packages/observability` (logs, tracing, LLM usage/cost), `packages/evaluation` (retrieval evals,
  baselines), `packages/security` (authentication, roles/permissions, PII redaction),
  `packages/orchestration` (LangGraph RAG answer graph, approval-gated graph, Postgres checkpoints),
  `packages/human-oversight` (approvals, review queue, answer feedback),
  `packages/audit` (append-only events, answer provenance, usage aggregate; PII redacted by `security`),
  `packages/memory` (conversation history within a budget, long-term facts by similarity),
  `packages/guardrails` (input policy, prompt-injection defense, tool allowlist, output checks),
  `packages/reliability` (timeouts, retries, circuit breakers, chat fallback),
  `packages/providers` (OpenAI, Anthropic, Google, Cohere, OpenAI-compatible models),
  `packages/native` (Rust binding loader; o200k_base token counting from `crates/text-processing`
  via `crates/bindings`, TS fallback).
- **Tests (live):** `tests/e2e` (Playwright, console + API), `tests/system` (API security, chaos,
  load against the API from source, a fake model and a cuttable Postgres proxy).
- **Deploy (live):** `deploy/compose.yml` on one host — Caddy (HTTPS) → console + api, worker,
  Postgres, daily `pg_dump` backups; runbooks in `docs/runbooks/`.
- **Planned:** more adapters
  (vector-store, cache, storage);
  more `crates/*` (only with a benchmark win); CD.
- `apps/api/src/modules/rag` composes ingestion → knowledge → retrieval → generation; Phase 1 of the
  roadmap (core RAG path) is complete.
- One owner per capability; domain packages never import vendor SDKs.
