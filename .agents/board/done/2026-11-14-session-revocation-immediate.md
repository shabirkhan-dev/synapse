---
id: syn-057
title: auth: a signed-out or revoked session stops working at once, not after 15 minutes
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
scope: [apps/api/src/modules/auth, apps/api/test, tests/system, docs]
allowed_shared: []
created: 2026-11-14
updated: 2026-11-14
---

## What

Access tokens were checked by signature only, so after sign-out, "Sign out" on another device, or
"Sign out everywhere else", the old access token kept working for up to 15 minutes.

## Why / Context

Gap review (2026-11-14), item 1 of 5. The account page promises "signed out"; a stolen token must
stop at revocation. Every request already reads the role from the database, so one more indexed
lookup costs little.

## Proposal or Ask

`authenticate` checks the token's session (`sid`) is not revoked or expired, in parallel with the
role lookup; otherwise `401 AUTH_SESSION_ENDED`.

## Scope

**In scope:** API check, tests, docs. **Out of scope:** shorter token lifetimes.

## Validation

- unit: revoked / signed-out / other-device sessions get 401; postgres integration for the query;
  security suite: an access token stops working right after sign-out

## Resolution

Landed (`fix(auth): …`): `AuthRepository.isSessionActive`; `AuthService.authenticate` checks the
token's session (not revoked, not expired, owned by the user) in parallel with the role lookup →
`401 AUTH_SESSION_ENDED`. The console needs no change: its 401 handling refreshes, which fails for
the ended session, and signs out.

Validation: unit (sign-out ends the access token; "sign out everywhere else" ends the other
device's, keeps the current one), Postgres integration (`isSessionActive` for active, wrong user,
revoked), security suite (access token after sign-out → `AUTH_SESSION_ENDED`); API 147 tests.

Cost: one primary-key lookup per authenticated request, run alongside the existing role query.
