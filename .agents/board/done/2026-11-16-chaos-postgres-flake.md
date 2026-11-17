---
id: syn-071
title: chaos: "Postgres goes away" failed once in CI — the API refused connections after the cut
type: risk
from: qa
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [tests/system/chaos, apps/api]
allowed_shared: []
created: 2026-11-16
updated: 2026-11-17
---

## What

CI run 43851499000 (commit 405c270, `system` job): `chaos/database.test.ts` "liveness stays up,
readiness and requests fail fast" timed out — after the TCP proxy cut Postgres, requests to the API
on :8200 got ECONNREFUSED; the API log ends with "checkpoint database connection lost" and nothing
until the SIGTERM. The next commit's run passed the same job, and the commit touched no database
code, so it is intermittent.

## Why / Context

If the API can stop accepting connections when Postgres drops, liveness is not what the chaos suite
claims. Possibly the checkpointer pool's error path, or the test's proxy cut racing the request.

## Proposal or Ask

Reproduce by looping the test locally (`bun run test:chaos` × 50); capture whether the process exits
or stalls; fix the cause, not the timeout.

## Scope

**In scope:** finding and fixing the cause. **Out of scope:** loosening the test.

## Validation

50 consecutive local passes, and the cause named in the resolution.

## Resolution

Landed in `fix(database): fail fast while postgres is unreachable` (on `main`).

**Cause.** The API was not refusing connections. The CI log shows `/health/ready` was never logged
and SIGTERM came exactly 5 s after the cut: the readiness request **hung**, Bun's 5 s test timeout
fired, teardown stopped the API, and the pending fetch, retried on a new connection, reported
`ECONNREFUSED`. The hang is postgres.js 4.1 (`pool.js` `attempted`): a connection that opens and is
then closed (`CONNECTION_CLOSED`, what the proxy cut, a restarting Postgres or a proxy in front look
like) counts as *transient*, so waiting queries are not rejected; the pool reconnects with a backoff
growing to 20 s until `connect_timeout` (default 30 s) has passed since the first failure. It only
happens when a query is in flight at the cut (the sign-up had just finished), hence the flake.
Reproduced outside the suite: 300 cuts with queries in flight through the chaos proxy → 17 pings
waited ≥ 3 s, the measured ones 35–44 s, and recovery after restore took ~11.6 s.

**Fix (the cause, not the test).**
- `@synapse/database`: `connect_timeout: 5` (`DATABASE_CONNECT_TIMEOUT_SECONDS`) and a reconnect
  delay capped at 1 s (`databaseReconnectDelay`). Same 300-cut probe: worst wait 5.8 s, recovery
  ≤ 1 s.
- `@synapse/adapters` checkpointer: `pg` `connectionTimeoutMillis: 5_000` (was: wait forever).
- API `/health/ready`: the ping has a 2 s deadline (`HEALTH_READY_TIMEOUT_MS`, `withTimeout`), so a
  probe always answers.

**Validation.** `packages/database/test/client.test.ts`: a server that accepts and closes → the query
fails with `CONNECTION_CLOSED` within 5–7 s (times out at 10 s without the fix, checked); delays
≤ 1 s. API `openapi.test.ts`: a hanging ping answers 503 within the deadline. Chaos suite looped
locally: 50 of 50 consecutive passes (`bun run test:chaos`). API 193 pass with Postgres; database 8 pass; lint, typecheck, architecture,
ci:test pass.
