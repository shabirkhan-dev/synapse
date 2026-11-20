---
id: syn-082
title: invite people by email to a team
type: feature
from: human
to: all
priority: normal
status: doing
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

_Open._
