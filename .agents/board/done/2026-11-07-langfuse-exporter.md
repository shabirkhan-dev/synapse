---
id: syn-020
title: Export LLM traces to Langfuse
type: feature
from: human
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-015]
branch: main
worktree: none
scope: [packages/observability, packages/providers]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Send traces (with prompts, completions, token usage, cost, prompt versions) to Langfuse.

## Why / Context

Langfuse gives prompt-level traces and eval scores in one UI. `@synapse/observability` already emits
OTLP spans with `gen_ai.*` attributes, so Langfuse's OTLP endpoint may be enough.

## Proposal or Ask

**Blocked on credentials:** a Langfuse host plus public/secret keys (via the environment's secret
settings, never in git). Then: try Langfuse's OTLP endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT` +
auth headers first; add a `providers/langfuse` exporter only if OTLP lacks something we need.

## Scope

**In scope:**

- `packages/observability/**`, `packages/providers/langfuse/**` if needed, config + docs

**Out of scope:**

- eval score upload (evaluation, syn-016)

## Validation

- traces visible in Langfuse for a real `/rag/query`, with model, tokens and cost

## Resolution

Done in commit `feat(observability): export traces to langfuse and keep credentials in one env file`.

- No Langfuse SDK and no `providers/langfuse`: Langfuse's OTLP endpoint was enough. `startTracing` takes `otlpHeaders`; the API builds `<LANGFUSE_BASE_URL>/api/public/otel` + Basic auth + `x-langfuse-ingestion-version: 4` from `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` (both or neither; not together with `OTEL_EXPORTER_OTLP_ENDPOINT`).
- Cost moved to the standard `gen_ai.usage.cost` attribute (Langfuse reads it as total cost).
- Verified against the real project (EU cloud): a smoke trace showed a `GENERATION chat openai/gpt-4o-mini` with input 1200 / output 300 tokens and cost $0.00036 under its request span. A real `/rag/query` trace needs `AI_API_KEY` (not set here).
- Tests: `apps/api/test/trace-export.test.ts` (endpoint, headers, validation).
- Follow-up (not done): link prompt versions to Langfuse prompts (`langfuse.observation.prompt.*`).
