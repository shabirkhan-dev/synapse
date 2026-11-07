---
id: syn-017
title: Build in-house authentication (access-token issuer)
type: risk
from: human
to: backend
priority: high
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/security, apps/api/src/modules/auth]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

The API verifies HS256 tokens but nothing issues them since the Nest API was removed.

## Why / Context

No real user can authenticate today; only tests mint tokens.

## Proposal or Ask

**Decided (2026-11-07, human): build it in-house** — ADR-0005. Users, credentials and sessions in our
Postgres; `packages/security` owns the logic; the API `auth` module exposes sign-up, sign-in,
refresh and sign-out. Access tokens stay short-lived JWTs with `sub` + `sid` so the current verifier
keeps working. Design flows and lifetimes, then implement.

## Scope

**In scope:**

- `packages/security/**`, auth module

**Out of scope:**

- authorization/permissions beyond owner scoping

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- `.agents/skills/security-review/` checklist

## Resolution

_Open._
