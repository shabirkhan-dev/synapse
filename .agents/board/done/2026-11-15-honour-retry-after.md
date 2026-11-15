---
id: syn-064
title: reliability: model retries wait for the vendor's Retry-After
type: bug
from: reviewer
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/reliability, apps/api/src/config, apps/api/test, docs]
allowed_shared: []
created: 2026-11-15
updated: 2026-11-15
---

## What

A rate-limited vendor (429) says how long to wait; our retries ignored it and tried again after a
jittered 0–4 s, usually too early, spending an attempt (and a breaker failure) for nothing.

## Why / Context

Gap review (2026-11-14), "later" item 3 of 3.

## Proposal or Ask

Read `retry-after-ms` / `retry-after` (seconds or HTTP date) from the error's response headers and
wait that long; a hint longer than a cap fails the call at once instead of holding the request.

## Scope

**In scope:** model and email calls through `createCallPolicy`. **Out of scope:** sharing a rate-limit
budget across replicas.

## Validation

- package: hints in ms, seconds and HTTP dates (from the error, `Headers` or its cause), junk
  ignored; a 429 waits 2 s then 750 ms, then a 503 backs off normally; a 60 s hint fails at once
- api: a 429 with `retry-after-ms: 120` is retried after ≥ 110 ms (test backoff is 0) and answers; a
  120 s hint fails at once and the fallback model answers

## Resolution

Landed in the `fix(reliability)` commit on `main`. `retryAfterMs(error)` and
`RetryOptions.maxRetryAfterMs` (default `maxDelayMs`) in `@synapse/reliability`; retry events carry
`retryAfter`. The API caps hints at 10 s (`RETRY_AFTER_MAX_MS`). Docs: `docs/packages/reliability.md`.
