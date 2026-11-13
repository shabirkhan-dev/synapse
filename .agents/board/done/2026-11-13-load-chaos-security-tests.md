---
id: syn-051
title: tests/: load, chaos and security suites for the api
type: feature
from: pm
to: qa
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-041]
branch: main
worktree: none
scope: [tests, docs/development/testing.md]
allowed_shared: [package.json]
created: 2026-11-13
updated: 2026-11-13
---

## What

Root `tests/` has browser e2e only. Add a load suite, a chaos suite and a security suite.

## Why / Context

Roadmap Phase 3. The production stack now exists (syn-041), but nothing measures throughput, how
the API behaves when Postgres or the model provider fails, or checks auth/tenancy from outside.

## Proposal or Ask

- `tests/load`: a scripted load run (sign-in, ingest, query, chat stream) against the fake model
  server with p50/p95 and error-rate thresholds.
- `tests/chaos`: stop Postgres / make the model server slow or 5xx mid-run; expect readiness 503,
  `504 RELIABILITY_TIMEOUT`, `503 RELIABILITY_CIRCUIT_OPEN`, recovery afterwards.
- `tests/security`: cross-tenant reads, token tampering, refresh reuse, rate limits, body limits,
  security headers.

## Scope

**In scope:** the three suites, root scripts, docs. **Out of scope:** CI load runs on every push.

## Validation

- each suite runs locally with one command and fails when its threshold or expectation is broken

## Resolution

Landed (`feat(tests): …`): `tests/system` workspace — one stack per test file (API from source,
the e2e fake model with a new `POST /__fault { delayMs?, status?, only? }`, a TCP proxy in front of
Postgres that can be cut), `bun run test:security|test:chaos|test:load`, CI job `system`.

- **security** (13 tests): tenant isolation across documents (read, list, all three search modes,
  delete), conversations, facts and organizations; a validly signed token for a foreign org →
  `AUTH_NOT_A_MEMBER`; every protected route in the OpenAPI document → 401 without a token;
  tampered / `alg: none` / wrong-secret / expired tokens → 401; refresh reuse after the grace window
  revokes the session; sign-out; 413 on every `POST`; malformed JSON; sign-in rate limit; security
  headers; CORS allow-list.
- **chaos** (7 tests): Postgres cut → liveness up, readiness 503, requests fail in < 5 s, recovery
  without a restart; slow model → 504; failing model → circuit opens (503) and closes after the
  reset; keyword search survives a model outage; a failed ingest leaves no document; a failing
  streamed chat ends with an error part.
- **load**: 20 virtual users × 20 s on the sandbox, ~257 req/s, 0 errors, p95 21–46 ms for
  list/search/answer and 648 ms for streaming chat (fake model; thresholds 250/500/1000/2000 ms,
  1% errors).

Bugs the suites found and fixed:

- **The API crashed when Postgres dropped:** the LangGraph checkpointer's `pg` pool had no `error`
  listener. `createPostgresCheckpointer` now builds the pool and takes `onError` (the API logs it).
- **Only auth and document upload limited body size** (Bun's default is 128 MiB): an app-wide
  2 MiB `requestBodyLimit` (after CORS, so the 413 is readable by the console).
- e2e flake: `getByText` for a page title also matched Next's route announcer; two specs now wait
  for the heading role.

Validation: security 13/13, chaos 7/7 (the 413 test fails with the cap removed; the database test
crashed the API before the fix), load thresholds met, `ci:test` 402 pass, e2e 16 pass, lint,
typecheck, architecture clean.

Not covered: a black-holed (hanging) database, the worker under chaos, load against real vendors.
