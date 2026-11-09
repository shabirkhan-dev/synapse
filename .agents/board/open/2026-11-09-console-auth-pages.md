---
id: syn-037
title: Console auth pages: sign up, verify email, reset password; tokens behind an httpOnly cookie
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-018]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

Verification and password-reset emails link to console pages (`/verify-email`, `/reset-password`)
that do not exist, and there is no sign-up page. Sign-in exists (syn-018) but keeps tokens in
`sessionStorage`, readable by page scripts.

## Why / Context

Auth is complete in the API (syn-017, syn-026); users need the pages the emails point to.

## Proposal or Ask

Extend `features/auth` (syn-018 pattern): sign-up, verify-email (token from the link),
forgot/reset password, Zod-validated forms with `@synapse/ui`. Decide (ADR) and implement moving
the refresh token into an httpOnly cookie via a same-origin Next route handler (BFF), so page
scripts never see it.

## Scope

**In scope:**

- auth feature, token handling in `lib/api`, Playwright checks

**Out of scope:**

- organization switching UI (later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- browser check of each flow against a local API (`browser-ui-test` skill)

## Resolution

_Open._
