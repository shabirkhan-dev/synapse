---
id: syn-033
title: Add reliability: timeouts, retries, circuit breakers and fallbacks for model calls
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/reliability, packages/adapters, apps/api, apps/worker]
allowed_shared: []
created: 2026-11-08
updated: 2026-11-08
---

## What

Model and embedding calls have no timeout, retry or breaker; one slow provider stalls requests.

## Why / Context

Error-handling rule: external calls get timeouts, bounded retries with backoff for retryable
errors, and circuit breakers / fallbacks from `packages/reliability`.

## Proposal or Ask

`@synapse/reliability`: `withTimeout`, `retry` (exponential backoff + jitter, retryable-error
predicate), `createCircuitBreaker` (open/half-open/closed), composed around the model gateway
(chat, embeddings) and email; a fallback chat model when configured; metrics in traces.

## Scope

**In scope:**

- `packages/reliability`, gateway wrapping, config, tests with fake clocks

**Out of scope:**

- multi-provider routing (→ `providers`)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a hanging provider times out; transient 5xx retries then succeeds; repeated failures open the breaker (tests)

## Resolution

_Open._
