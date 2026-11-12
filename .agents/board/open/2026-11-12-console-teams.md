---
id: syn-043
title: Console teams: organization switcher, members and roles
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-040]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

Organizations, members and roles exist in the API (syn-032, ADR-0006) but the console always works
in the personal organization: no way to create a team, add people or switch.

## Why / Context

Approvals only make sense with other people (members ask, admins decide); activity scoping by role
cannot be seen in the console today.

## Proposal or Ask

`features/organizations`: list memberships with role, create a team, switch the active
organization (`POST /auth/switch-organization`, new access token; refetch every query), members
list with add-by-email, change role, remove (last owner protected), role-aware UI (hide decide
buttons for members), e2e of a member asking and an admin deciding.

## Scope

**In scope:**

- switcher in the header, members page, role-aware approvals, tests, e2e

**Out of scope:**

- invitation emails, SSO

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

_Open._
