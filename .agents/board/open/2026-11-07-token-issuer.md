---
id: syn-017
title: Decide and build the access-token issuer
type: risk
from: human
to: human
priority: high
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/security, apps/api/src/modules/auth]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

The API verifies HS256 tokens but nothing issues them since the Nest API was removed.

## Why / Context

No real user can authenticate today; only tests mint tokens.

## Proposal or Ask

Human decision: build users/sessions in `security/authentication`, or use an external provider (OIDC). Then implement.

## Scope

**In scope:**

- `packages/security/**`, auth module

**Out of scope:**

- authorization/permissions beyond owner scoping

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- `.agents/skills/security-review/` checklist

## Resolution

_Open._
