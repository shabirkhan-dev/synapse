---
id: syn-045
title: Console account: resend verification email and active sessions
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-043]
branch: main
worktree: none
scope: [apps/console, apps/api/src/modules/auth, packages/database, packages/ui, tests/e2e]
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

Done in commit `feat(account): list and sign out signed-in devices, resend the verification link`.

- **API:** `auth_sessions.user_agent` (migration `0014_session_user_agent`, idempotent), set at sign-up/sign-in from `User-Agent` (≤ 512 chars; no IP stored). `GET /auth/sessions` (active, current marked, never tokens), `DELETE /auth/sessions/{id}` (`404 AUTH_SESSION_NOT_FOUND` for someone else's or an inactive one), `POST /auth/sessions/revoke-others` → `{ revoked }`; audit `auth.sessions.revoked`. Repository `revokeSession` now reports whether it revoked.
- **Console `features/account`** (`/account`, nav "Account"): email with Verified / Not verified (icon + word), "Send a new link" (API's 429 message shown), devices described in words ("Safari on iOS", "This device" first), last active in relative time, sign out one, "Sign out everywhere else" behind a confirmation with the count. Every workspace page shows a "Verify your email" notice until verified; verifying in the same tab clears it.
- **Interface review (better-interface):** card titles were `div`s and the auth pages had no `h1` (WCAG 1.3.1) → `CardTitle` renders `h2` via Base UI `useRender`, `render={<h1 />}` in `AuthCard`; empty status regions added blank gaps → `empty:sr-only`.
- **Validation:** API 141 tests with Postgres integration (incl. the migration, list/revoke/revoke-others on a real DB, 4 HTTP tests: list with UA and current, revoke another → its refresh is 401, twice → 404, another user → 404, revoke-others keeps this one, bearer required); console 66 (user-agent descriptions, relative time, list ordering and confirm, email status both states, container revoke + resend + 429); e2e 12 incl. `account.spec.ts` (two browsers) and layout at 320px incl. `/account`; heading outline checked in the browser.
- **Not done:** MFA, changing email or password from the account page, IP/location per session, a revoked device still has ≤ 15 min of access token.
