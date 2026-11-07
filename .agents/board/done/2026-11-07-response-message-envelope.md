---
id: syn-005
title: Add message to responses and nest error code
type: feature
from: human
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [apps/api/src/shared/responses]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Success `{ success, statusCode, message, data, … }`; error `{ success, statusCode, message, error: { code, details? }, … }`.

## Why / Context

Human-readable message on every response; machine-readable code kept separate.

## Proposal or Ask

Change the envelope, use message constants, enforce no inline messages.

## Scope

**In scope:**

- `apps/api/**`, `docs/api/conventions.md`

**Out of scope:**

- console client (does not exist yet)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

Done in `28e9643` (breaking change, no consumers yet).
