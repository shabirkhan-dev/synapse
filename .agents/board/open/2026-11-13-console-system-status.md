---
id: syn-056
title: console: system status — dependencies, circuit breakers, jobs, index health, traces
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: none
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

_Open._
