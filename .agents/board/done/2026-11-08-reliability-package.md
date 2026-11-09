---
id: syn-033
title: Add reliability: timeouts, retries, circuit breakers and fallbacks for model calls
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/reliability, packages/adapters, apps/api, apps/worker]
allowed_shared: []
created: 2026-11-08
updated: 2026-11-09
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

Done in commit `feat(reliability): add timeouts, retries, circuit breakers and chat fallback`.

- `@synapse/reliability`: `withTimeout` (a call that ignores its signal still rejects at the deadline), `retry` (full jitter, retryable errors only), `isRetryableError` (flags, status 408/409/425/429/5xx, network errors, one level of `cause`), `createCircuitBreaker` (closed/open/half-open, one trial call, 4xx do not count), `createCallPolicy` (retry → breaker → timeout per attempt), `withModelReliability` (chat + embeddings policies, fallback chat model; the result names the model that answered, so provenance stays true).
- `SynapseError` gained `retryable`; Resend marks network failures, 429 and 5xx retryable. Adapters make one attempt per gateway call (`maxRetries: 0`) so retries are not multiplied.
- api: `infrastructure/models/create-model-gateway.ts` (reliability inside instrumentation: one span per logical call, retries/circuit changes/fallbacks as span events and warn logs); email behind its own policy; error handler maps `RELIABILITY_CIRCUIT_OPEN` → 503 and `RELIABILITY_TIMEOUT` → 504. worker: embeddings wrapped.
- Config: `AI_CHAT_TIMEOUT_MS`, `AI_EMBEDDING_TIMEOUT_MS`, `AI_RETRY_ATTEMPTS`, `AI_CIRCUIT_FAILURE_THRESHOLD`, `AI_CIRCUIT_RESET_MS` (in `.env.example` and Doppler `synapse/dev`), optional `AI_FALLBACK_CHAT_MODEL`.
- **Validation:** 14 package tests with a fake clock (hanging call times out, caller abort passes through, transient 5xx retries with the expected backoff, 400 is final, breaker opens/fails fast/half-open/closes, one trial call only, retries stop once open, fallback only for outages); 6 API tests through the real app (503 retried then answered, 400 not retried, circuit → 503 without calling the model, hanging model → 504 after 2 attempts, fallback answers with `mock:mock-fallback` provenance, embedding retry on ingest); Resend retryable flags. Real-server smoke (built bundle, fake provider answering 503 to chat): first query 503 `RELIABILITY_CIRCUIT_OPEN` after 2 provider calls in 0.12 s (the policy stops at once when the circuit opens, no backoff wait), second query 503 in 14 ms with no provider call; warn logs `chat retry`, `circuit open`; 0 errors logged.
- **Not done:** streaming chat (AI SDK's own retries only), shared breaker state across replicas, `Retry-After`, idempotency keys, per-dependency health.
