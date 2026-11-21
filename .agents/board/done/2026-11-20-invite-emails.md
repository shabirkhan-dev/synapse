---
id: syn-082
title: invite people by email to a team
type: feature
from: human
to: all
priority: normal
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [packages/database, packages/security, apps/api auth/organizations, apps/console organizations, tests/e2e]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-20
---

## What

Admins invite an address that has no account yet; the email links to sign-up, and the person joins the team with the invited role.

## Why / Context

Gap review 2026-11-19 (item 5): members can be added only if they already have an account.

## Proposal or Ask

Single-use hashed invite tokens (like `auth_tokens`), expiry, revoke; pending invites on the Team page; accept after sign-up or sign-in with the invited email. Done with API tests and an e2e that reads the emailed link from the dev log.

## Scope

**In scope:** packages/database, packages/security, apps/api auth/organizations, apps/console organizations, tests/e2e.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

Migration 0020 `organization_invitations` (token stored as SHA-256). API: invite (admins; owners for
admin/owner; teams only; refuses existing accounts with `409 ORGANIZATION_USER_EXISTS`; one pending
per address, ≤ 50 per team; the invitation is dropped if the email fails), list, withdraw, accept
(signed-in account must have the invited email; single use, before expiry; never demotes). Emails
link to `APP_URL/invite?token=…` (7 days). Console: "Add member" invites addresses without an account
and lists pending invitations with Withdraw; `/invite` joins when signed in, or sends you through
sign-up / sign-in (`?invite=`) and back.

Validation: API 4 new tests (invite → sign up → accept once; other email refused; replaced and
withdrawn links die; existing account, member, personal workspace refused; email failure keeps
nothing) + Postgres integration (replace, expiry, single use, no demotion); e2e invitations spec
(invite from the Team page, link from the API log, sign up from it, join, owner sees the member).
