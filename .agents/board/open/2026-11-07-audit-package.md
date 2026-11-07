---
id: syn-029
title: Add audit: event history and stored answer provenance
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-025]
branch: main
worktree: none
scope: [packages/audit, packages/database, apps/api]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Provenance is returned with answers but never stored; there is no event history.

## Why / Context

Rule 6: every answer is traceable. Known constraint: provenance is returned, not stored.

## Proposal or Ask

An append-only `audit_events` table (actor, action, subject, data, provenance) behind an `AuditLog` contract; record answers, ingests, deletes and auth events; PII redaction before write.

## Scope

**In scope:**

- `packages/audit`, table, API wiring

**Out of scope:**

- retention policies beyond a prune job

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- every answered query writes one event with its provenance (integration test)

## Resolution

_Open._
