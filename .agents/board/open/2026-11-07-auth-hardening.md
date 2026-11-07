---
id: syn-026
title: Harden auth: rate limits, email verification, password reset
type: risk
from: reviewer
to: backend
priority: high
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-017]
branch: main
worktree: none
scope: [packages/security, apps/api/src/modules/auth, packages/database]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

syn-017 shipped sign-up/sign-in/refresh/sign-out without brute-force protection or account recovery.

## Why / Context

Found in the syn-017 security review. Before real users: sign-in can be guessed at full speed,
nobody can prove they own their email, and a forgotten password locks the account forever.

## Proposal or Ask

1. Rate limit sign-in and sign-up per email and per client IP (Postgres-backed so it works across
   instances; trust `x-forwarded-for` only behind a configured proxy).
2. Email verification and password reset with single-use, hashed, expiring tokens; needs an email
   adapter (`adapters/` contract, provider in `providers/`).
3. Optional later: list and revoke sessions, MFA (TOTP / passkeys), organizations (tenancy).

## Scope

**In scope:**

- limits, verification, reset, their tables and endpoints

**Out of scope:**

- SSO, organizations (own cards)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- tests: limit hit returns 429; reset token works once and expires
- `.agents/skills/security-review/` checklist

## Resolution

_Open._
