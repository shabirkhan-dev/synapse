---
id: syn-015
title: Create @synapse/observability (OpenTelemetry + Langfuse)
type: feature
from: human
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/observability]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Tracing, structured logging and LLM cost tracking; replace the API's local logger.

## Why / Context

We need to see latency, cost and quality before scaling features.

## Proposal or Ask

OTel tracing with request ids, Langfuse exporter, logger moved out of `apps/api`.

## Scope

**In scope:**

- `packages/observability/**`, `apps/api/src/infrastructure/logger/**`

**Out of scope:**

- dashboards

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

Done in commit `feat(observability): add observability package with tracing and structured logs`.

- `@synapse/observability`: `createLogger` (json/pretty, child, trace ids), `startTracing` (OpenTelemetry 3.x, AsyncLocalStorage context, OTLP/HTTP), `withSpan`, `instrumentModelGateway` (GenAI spans + `llm call` logs + cost), `estimateCostUsd`; 7 tests.
- `apps/api`: local logger removed; request span per route pattern with `http.*` + `synapse.request_id`; LLM spans are children; config `LOG_FORMAT`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `AI_MODEL_PRICES`; tracing flushed on shutdown.
- `architecture:check`: `@opentelemetry/*` only inside `packages/observability`.
- Verified: production boot emits JSON logs with trace ids; OTLP export reached a local receiver (`POST /v1/traces`).
- Langfuse split out to syn-020 (needs credentials).
