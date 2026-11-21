# Synapse roadmap

> Updated: 2026-11-20. Source of truth for "where are we". Cards on `.agents/board/` track each step;
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
| Console: retrieval inspector — one query through each search mode | ✅ | syn-048 |
| Console: usage — answers, tokens and cost by model and prompt version | ✅ | syn-049 |
| Record streaming chat answers with provenance (rule 6 gap found in syn-049) | ✅ | syn-050 |
| Fix first CI e2e run (refresh reuse grace, pre-hydration clicks) | ✅ | syn-042 |
| Console: ingestion — upload files (text, Markdown, PDF) | ✅ | syn-053 |
| Console: evaluations — your own question sets, scored per search mode | ✅ | syn-054 |
| Console: agents — the assistant's model, prompt, tools and guardrails, and its recent runs | ✅ | syn-055 |
| Console: system status — dependencies, circuit breakers, jobs, index health, traces | ✅ | syn-056 |
| `tests/` — Playwright e2e for console + API in CI | ✅ | syn-039 |
| `tests/` — load, chaos, security suites | ✅ | syn-051 |
| `deploy/` — production compose, Caddy TLS, backups, restore, runbooks | ✅ | syn-041 |
| Real CD deploy (registry images, deploy to the host on tag) — done in Phase 6 | ✅ | syn-052 |

## Phase 4 — Hardening (gap review 2026-11-14)

Deployment is parked (syn-052). Gaps found in what is built, most severe first.

| Step | Status | Card |
| --- | --- | --- |
| Signed-out / revoked sessions stop working at once (not after 15 min) | ✅ | syn-057 |
| Rate limits on model-calling endpoints (chat, answers, uploads, evaluation runs) | ✅ | syn-058 |
| Streaming chat: timeout, circuit breaker | ✅ | syn-059 |
| PDF parsing off the main thread with a deadline | ✅ | syn-060 |
| Chat history loads only what a turn can use | ✅ | syn-061 |
| Undecided approvals expire (`APPROVAL_TTL_HOURS`) | ✅ | syn-062 |
| Secrets removed from streamed chat replies | ✅ | syn-063 |
| Model retries wait for the vendor's `Retry-After` | ✅ | syn-064 |
| Console UI/UX pass: clean, modern, consistent across pages | ✅ | syn-065 |

## Phase 5 — The best RAG experience (review 2026-11-16, `phase-5-rag-quality.md`)

Deployment stays parked. Ranked by value from a review of RAGFlow, Onyx, Perplexity, Glean,
contextual retrieval and Ragas.

| Step | Status | Card |
| --- | --- | --- |
| Readable answers: safe Markdown in chat and the Playground | ✅ | syn-066 |
| One citation system: numbered citations in chat, passage preview, source cards | ✅ | syn-067 |
| Context-carrying chunks: heading path + title in embeddings and keyword index | ✅ | syn-068 |
| Light / dark / system theme switch; refined surfaces (Calesto, HockeyStack as inspiration) | ✅ | syn-069 |
| Closer to the Calesto reference: account menu, page pill, chat cards, floating composer | ✅ | syn-072 |
| Scoped questions: ask about chosen documents | ✅ | syn-070 |
| Risk: chaos "Postgres goes away" failed once in CI — requests hung up to 45 s on a database blip; now fail within ~5 s | ✅ | syn-071 |
| Answer quality scores (faithfulness, relevance) in evaluations | ✅ | syn-073 |
| Several files at once; web pages by URL (SSRF-safe) | ✅ | syn-074 |
| Follow-up suggestions, copy, regenerate; ⌘K palette | ✅ | syn-075 |
| Chat: choose documents (the API already scopes chat turns) | ✅ | syn-076 |
| Re-chunk documents from before text-v2 in the worker (text-v2 without saved context: re-add) | ✅ | syn-077 |
| Console UI/UX pass 2: Inter, flat #1C1C1C, 14px controls, breadcrumb shell (the human's spec) | ✅ | syn-078 |
| Console detail polish: tabs for adding documents, mono font, aligned tables, one citation look | ✅ | syn-079 |
| Check the answer judge against its labelled cases with a real model (needs a chat key) | ⬜ | — |

## Phase 6 — Production readiness (the human's pick from the 2026-11-19 review: items 2, 5, 7)

| Step | Status | Card |
| --- | --- | --- |
| Images built and pushed to GHCR on a tag; SSH deploy once the host secrets exist | ✅ | syn-052 |
| Off-site backup copies (S3-compatible, optional) | ✅ | syn-080 |
| Document permissions inside an organization (ADR-0008) | ✅ | syn-081 |
| Invite people by email | ✅ | syn-082 |
| Personal API keys | ✅ | syn-083 |
| Two-step sign-in (TOTP) | 🔄 | syn-084 |
| Secrets removed from chat tool results | ⏭️ | syn-085 |
| Chat: rename, keep stopped answers, versions on regenerate | ⬜ | syn-086 |
| Palette searches everything; shell shows while the session loads | ⬜ | syn-087 |
| First-run onboarding with sample documents | ⬜ | syn-088 |
| Automated accessibility checks (axe) on every page | ⬜ | syn-089 |
| Company SSO (SAML/OIDC) — parked: needs an identity provider to test against | ⬜ | — |

Cards are raised for "—" rows when they become the next two or three steps.
