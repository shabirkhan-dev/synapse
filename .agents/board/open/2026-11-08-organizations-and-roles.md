---
id: syn-032
title: Add organizations and roles (multi-user tenancy)
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-017]
branch: main
worktree: none
scope: [packages/security, packages/database, apps/api]
allowed_shared: []
created: 2026-11-08
updated: 2026-11-08
---

## What

Every user is their own tenant (`sub`); there is no way to share documents or have someone else
approve an action.

## Why / Context

Security architecture: tenancy and permissions are planned in `security`. Human oversight needs
reviewers other than the owner.

## Proposal or Ask

Organizations with members and roles (`owner`, `admin`, `member`); the access token carries the
active organization; RAG, memory and audit rows are scoped to the organization (migration that
moves today's per-user rows into a personal organization); approvals decided by admins.

## Scope

**In scope:**

- tables, token claim, authorization checks, data migration, docs

**Out of scope:**

- SSO, billing

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a member cannot see another organization's data; an admin approves a member's request (integration test)

## Resolution

_Open._
