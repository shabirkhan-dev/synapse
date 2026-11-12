---
id: syn-045
title: Console account: resend verification email and active sessions
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-043]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

An account page: resend the verification email (`POST /auth/verify-email/resend` exists) and a
list of signed-in sessions with "sign out everywhere else" (needs API routes).

## Why / Context

Known constraint: no resend button and no session list; a lost device cannot be signed out.

## Proposal or Ask

API: `GET /auth/sessions` (current marked), `DELETE /auth/sessions/{id}`; console `features/account`
with the unverified banner + resend, sessions table, revoke; tests and e2e.

## Scope

**In scope:**

- account page, two auth routes, tests, e2e

**Out of scope:**

- MFA, changing the email address

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

_Open._
