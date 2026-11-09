---
id: syn-037
title: Console auth pages: sign in, sign up, verify email, reset password
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
that do not exist, and there is no sign-in UI.

## Why / Context

Auth is complete in the API (syn-017, syn-026); users need the pages the emails point to.

## Proposal or Ask

`features/auth` per the frontend standard (pages → containers → mutation hooks → plain services →
`lib/api`): sign-in, sign-up, verify-email (token from the link), forgot/reset password; token
storage and refresh in the API client; Zod-validated forms with `@synapse/ui`.

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
