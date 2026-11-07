---
id: syn-015
title: Create @synapse/observability (OpenTelemetry + Langfuse)
type: feature
from: human
to: backend
priority: normal
status: open
assignee: none
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

_Open._
