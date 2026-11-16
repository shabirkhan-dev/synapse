---
id: syn-071
title: chaos: "Postgres goes away" failed once in CI — the API refused connections after the cut
type: risk
from: qa
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [tests/system/chaos, apps/api]
allowed_shared: []
created: 2026-11-16
updated: 2026-11-16
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

_Open._
