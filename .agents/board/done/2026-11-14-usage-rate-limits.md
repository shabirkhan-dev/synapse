---
id: syn-058
title: api: per-user rate limits on endpoints that call models
type: bug
from: reviewer
to: backend
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [apps/api/src, apps/api/test, tests/system, docs, .env.example]
allowed_shared: []
created: 2026-11-14
updated: 2026-11-14
---

## What

Only the auth routes were rate limited. Chat, answers, searches, ingests and evaluation runs call
paid models with no per-user limit: one account (or a stolen token) could run up any bill.

## Why / Context

Gap review (2026-11-14), item 2 of 5.

## Proposal or Ask

A shared middleware on the existing Postgres fixed-window limiter, per user, three budgets set by
env: questions (chat + `/rag/query`, 20/min), ingests (paste + upload, 200/h), evaluation runs
(10/h). Over budget → `429 RATE_LIMITED` with `Retry-After`.

## Scope

**In scope:** API, tests, docs. **Out of scope:** per-organization quotas, token-based budgets.

## Validation

- unit: the n+1th call in a window is 429 with Retry-After, other users and budgets unaffected;
  security suite covers it against Postgres

## Resolution

Landed (`fix(api): …`): `shared/middleware/usage-limit.ts` (`createUsageLimit`) on the auth
module's `DrizzleRateLimiter` (one instance now shared), mounted after authentication with
`app.on("POST", …)` for questions (`/chat`, `/rag/query`), ingests (`/rag/documents`, `/upload`)
and evaluation runs; `config/limits.config.ts` from `RATE_LIMIT_*` (in `.env.example` and Doppler
`synapse/dev`); shared `RATE_LIMITED` code and message with the wait in seconds.

Validation: unit (third question in the window → 429 with matching `Retry-After` and details, chat
shares the budget, other user unaffected, ingests separate, reads unlimited); security suite
against the Postgres limiter; system suites raise budgets for themselves; API 149, security 14,
chaos 7.

Not covered: per-organization quotas, token- or cost-based budgets.
