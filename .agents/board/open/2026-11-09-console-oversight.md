---
id: syn-040
title: Console oversight: approvals queue and activity (audit) views
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-038]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

Approvals (syn-028, ADR-0006) and the audit trail (syn-029) have no UI: members cannot see their
requests, admins cannot decide, nobody can browse the history.

## Why / Context

Risky actions (purging documents) wait for an approval nobody can give from the console.

## Proposal or Ask

`features/oversight`: pending approvals (`GET /oversight/approvals`) with approve/reject for
admins and owners (`403` handled for members), the purge-documents request from the Documents page,
and an activity view over `GET /audit/events` (role-scoped by the API).

## Scope

**In scope:**

- approvals list + decide, purge request button, activity list, tests, browser check

**Out of scope:**

- organization management UI (later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- browser check: member requests, admin approves, documents are gone, history shows both

## Resolution

_Open._
