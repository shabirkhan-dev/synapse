---
id: syn-062
title: oversight: undecided approval requests expire
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
scope: [packages/human-oversight, packages/database, apps/api/src/modules/oversight, apps/api/src/config, apps/console/src/features/oversight, docs]
allowed_shared: [.env.example]
created: 2026-11-15
updated: 2026-11-15
---

## What

An approval request stayed pending forever: a purge asked for months ago could still be approved
today, long after the person who asked (and the documents it counted) had moved on.

## Why / Context

Gap review (2026-11-14), "later" item 1 of 3.

## Proposal or Ask

`approval_requests.expires_at`, set at request time from `APPROVAL_TTL_HOURS` (72). Undecided past it
reads as `expired`, leaves the queue, and deciding it is `409 OVERSIGHT_APPROVAL_EXPIRED`.

## Scope

**In scope:** expiry on read and on decide; the console shows when each request expires.
**Out of scope:** pruning the expired runs' graph checkpoints; notifying the requester.

## Validation

- package: expired request reads `expired`, leaves the queue, decide throws; pending until expiry
- api unit: purge request has `expiresAt`; after expiry the queue is empty and approve is 409, the
  documents stay
- integration (Postgres): one-hour TTL, a backdated `expires_at` is out of the queue and refused,
  nothing runs
- console: each request shows its expiry time

## Resolution

Landed in the `feat(oversight)` commit on `main`. `createApprovals(store, { ttlMs, now? })` stamps
`expiresAt` and derives `expired` (never stored); the repository's queue and `decide` skip rows past
`expires_at`. Migration `0017_approval_expiry` (`IF NOT EXISTS`) gives waiting rows 72 h from creation.
`APPROVAL_TTL_HOURS` in `.env.example` and Doppler `synapse/dev`. Docs: `docs/packages/human-oversight.md`,
`docs/api/endpoints.md`.
