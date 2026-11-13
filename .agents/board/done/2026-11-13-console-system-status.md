---
id: syn-056
title: console: system status — dependencies, circuit breakers, jobs, index health, traces
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [apps/api/src/modules, apps/console/src/features, tests/e2e, docs]
allowed_shared: [packages/reliability]
created: 2026-11-13
updated: 2026-11-13
---

## What

A System page for admins and owners: database reachability and latency, each circuit breaker's
state (chat, embedding, email, reranker), background jobs (queues, last re-embed checkpoint),
chunks on an old embedding model, and where traces are exported.

## Why / Context

Roadmap Phase 3 "Console: observability". Today this is only visible in logs and Langfuse.

## Proposal or Ask

API `GET /system/status` (admins/owners, no secrets); console page reading it, refreshed every 30 s.

## Scope

**In scope:** read-only status of this API process. **Out of scope:** alerts, metrics history.

## Validation

- API tests (member gets 403; breaker open shows open); console test; e2e page loads for an owner

## Resolution

Landed (`feat(system): …`):

- `infrastructure/reliability/circuit-status.ts`: last state per circuit, fed by the circuit events
  of the model gateway, reranker and email policies (passed in from `server.ts`).
- API module `system`: `GET /system/status` (admins/owners) — database ping and latency, circuits
  with `resetAfterMs`, pg-boss counts by queue × state (`null` before the worker's first start),
  latest job checkpoints, this organization's chunks by embedding model, trace destination + host.
- Console `/system` (sidebar: Oversight → System): summary tiles, circuit table (Working / Failing
  fast / Testing), jobs by state, checkpoints, index card with out-of-date chunk count, traces;
  refreshes every 30 s; members see who can view it.

Validation: API 4 + Postgres integration (pgboss query, checkpoints, chunk counts); chaos suite
asserts `/system/status` shows the `embeddings` circuit open when the model fails; console 2; e2e
`system.spec.ts`, layout 11 links with `/system` at 320 px; screenshots dark and 320 px.

Not covered: replicas' circuits, metrics history and alerts.
