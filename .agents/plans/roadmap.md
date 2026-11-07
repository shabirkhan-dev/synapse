# Synapse roadmap

> Updated: 2026-11-07. Source of truth for "where are we". Cards on `.agents/board/` track each step;
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

## Phase 1 — Core RAG path (build order) ✅ (except Langfuse export, blocked on credentials)

| Step | Status | Card |
| --- | --- | --- |
| `adapters` — model gateway (+ first `core` contracts) | ✅ | syn-010 |
| `ingestion` — normalize, dedup, pipeline | ✅ | syn-011 |
| `knowledge` — chunking + embeddings with versions | ✅ | syn-012 |
| `retrieval` — vector + keyword + hybrid fusion | ✅ | syn-013 |
| `generation` — prompts, context, citations, provenance | ✅ | syn-014 |
| `observability` — OpenTelemetry tracing, structured logs, LLM usage/cost | ✅ | syn-015 |
| Langfuse export (needs credentials) | ⬜ | syn-020 |
| `evaluation` — datasets, retrieval metrics, CI regression | ✅ | syn-016 |

## Phase 2 — Platform capabilities (after the RAG path works)

First, the two retrieval fixes found by the Phase 1 evaluation.

| Step | Status | Card |
| --- | --- | --- |
| Keyword search: match any term (eval finding) | ✅ | syn-021 |
| HNSW owner filtering stays complete with many tenants (risk) | ⏭️ | syn-022 |
| `security` — in-house auth (ADR-0005), tenancy, permissions, PII | ⏭️ | syn-017 |
| `apps/worker` + pg-boss queue adapter, resumable jobs | ⬜ | — |
| `orchestration` — LangGraph graphs, checkpoints | ⬜ | — |
| `human-oversight` — approvals, review queues, feedback | ⬜ | — |
| `memory` — conversation, semantic, episodic | ⬜ | — |
| `audit` — event history, provenance, retention | ⬜ | — |
| `guardrails` — input/output/tool policies, injection defense | ⬜ | — |
| `reliability` — retry, breakers, timeouts, fallbacks | ⬜ | — |
| `providers` — OpenAI, Anthropic, Google, Cohere, Langfuse | ⬜ | — |
| Reranking (Cohere via adapter) | ⬜ | — |
| `native` + `crates/` (napi-rs) | ⬜ | — |

## Phase 3 — Product and operations

| Step | Status | Card |
| --- | --- | --- |
| Console: `@synapse/ui` wired + first feature (documents) | ⬜ | syn-018 |
| Console features: knowledge, ingestion, retrieval, playground, agents, evaluations, observability | ⬜ | — |
| `tests/` — cross-package e2e, load, chaos, security | ⬜ | — |
| `deploy/` — docker, compose, migrations, backups, monitoring | ⬜ | — |
| Real CD deploy + runbooks filled in | ⬜ | — |

Cards are raised for "—" rows when they become the next two or three steps.
