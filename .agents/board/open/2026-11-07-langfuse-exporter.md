---
id: syn-020
title: Export LLM traces to Langfuse
type: feature
from: human
to: backend
priority: normal
status: open
assignee: none
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

_Open._
