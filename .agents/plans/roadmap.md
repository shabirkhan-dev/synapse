# Synapse roadmap

> Updated: 2026-11-12. Source of truth for "where are we". Cards on `.agents/board/` track each step;
> update this file in the same change that moves a card. Legend: ✅ done · 🔄 doing · ⏭️ next · ⬜ later.

## Phase 0 — Foundation ✅

| Step | Status | Card |
| --- | --- | --- |
| Import starter, clean up, rename, apps `api` + `console`, fresh `@synapse/ui` | ✅ | syn-001 |
| `.agents/` rules, skills, memory; `docs/` skeleton with ADRs 0001–0004 | ✅ | syn-001 |
| `@synapse/core` (errors, config, provenance type) | ✅ | syn-002 |
| Backend/frontend standards, enforced by `architecture:check` | ✅ | syn-003 |
| `@synapse/database`; API restructured to the standard | ✅ | syn-004 |
| Response envelope with `message` + `error: { code }` | ✅ | syn-005 |
| Agent wiring (Codex, OpenCode, Claude Code) | ✅ | syn-006 |
| Roadmap + board tracking | ✅ | syn-007 |

## Phase 1 — Core RAG path (build order) ✅

| Step | Status | Card |
| --- | --- | --- |
| `adapters` — model gateway (+ first `core` contracts) | ✅ | syn-010 |
| `ingestion` — normalize, dedup, pipeline | ✅ | syn-011 |
| `knowledge` — chunking + embeddings with versions | ✅ | syn-012 |
| `retrieval` — vector + keyword + hybrid fusion | ✅ | syn-013 |
| `generation` — prompts, context, citations, provenance | ✅ | syn-014 |
| `observability` — OpenTelemetry tracing, structured logs, LLM usage/cost | ✅ | syn-015 |
| Langfuse export (OTLP) | ✅ | syn-020 |
| `evaluation` — datasets, retrieval metrics, CI regression | ✅ | syn-016 |

## Phase 2 — Platform capabilities (after the RAG path works) ✅

Every Phase 2 step is done (syn-021 … syn-036).

| Step | Status | Card |
| --- | --- | --- |
| Keyword search: match any term (eval finding) | ✅ | syn-021 |
| One env file for all credentials and settings | ✅ | syn-023 |
| Secrets in Doppler; `bun run env:pull` / `env:push` | ✅ | syn-027 |
| HNSW owner filtering stays complete with many tenants (risk) | ✅ | syn-022 |
| `security` — in-house auth: sign-up, sign-in, refresh, sign-out (ADR-0005) | ✅ | syn-017 |
| Auth hardening — rate limits, email verification, password reset (Resend) | ✅ | syn-026 |
| `apps/worker` + pg-boss queue adapter, resumable jobs | ✅ | syn-024 |
| `orchestration` — LangGraph graphs, checkpoints | ✅ | syn-025 |
| `human-oversight` — approvals, review queues, feedback | ✅ | syn-028 |
| `audit` — event history, provenance, retention | ✅ | syn-029 |
| `memory` — conversation, semantic, episodic | ✅ | syn-030 |
| `guardrails` — input/output/tool policies, injection defense | ✅ | syn-031 |
| `security` — organizations, roles, permissions (ADR-0006) | ✅ | syn-032 |
| `reliability` — retry, breakers, timeouts, fallbacks | ✅ | syn-033 |
| `providers` — OpenAI, Anthropic, Google, Cohere | ✅ | syn-034 |
| Reranking (Cohere via adapter) | ✅ | syn-035 |
| `native` + `crates/` (napi-rs): Rust token counting | ✅ | syn-036 |

## Phase 3 — Product and operations

| Step | Status | Card |
| --- | --- | --- |
| Console: `@synapse/ui` wired + sign-in + first feature (documents) | ✅ | syn-018 |
| Console: sign-up, verify email, reset password; httpOnly-cookie session (ADR-0007) | ✅ | syn-037 |
| Console: playground (ask, citations, provenance, feedback) | ✅ | syn-038 |
| Console: approvals and activity (oversight, audit) | ✅ | syn-040 |
| Console: teams — organization switcher, members, roles | ✅ | syn-043 |
| Console: chat — streaming answers, stored conversations (+ first UI/UX review) | ✅ | syn-044 |
| Console: account — resend verification, active sessions | ✅ | syn-045 |
| Console: shell — sidebar + inset content, system dark mode | ✅ | syn-047 |
| Console: knowledge — document detail, chunk versions, delete a document | ✅ | syn-046 |
| Console: retrieval inspector — one query through each search mode | ⏭️ | syn-048 |
| Fix first CI e2e run (refresh reuse grace, pre-hydration clicks) | ✅ | syn-042 |
| Console features: knowledge, ingestion, retrieval, agents, evaluations, observability | ⬜ | — |
| `tests/` — Playwright e2e for console + API in CI | ✅ | syn-039 |
| `tests/` — load, chaos, security suites | ⬜ | — |
| `deploy/` — docker, compose, migrations, backups, monitoring | ⬜ | syn-041 |
| Real CD deploy + runbooks filled in | ⬜ | — |

Cards are raised for "—" rows when they become the next two or three steps.
