---
id: syn-018
title: Wire @synapse/ui into the console and build the first feature
type: feature
from: human
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-017]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Tailwind + `@synapse/ui`, `lib/api` client, TanStack Query, and a first feature (documents list + ingest) per the frontend standard.

## Why / Context

The console is bare; this sets the pattern every feature copies.

## Proposal or Ask

Follow `.agents/skills/frontend-feature-development/`.

## Scope

**In scope:**

- `apps/console/**`, `packages/ui/**`

**Out of scope:**

- other features

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- `bun run build`; browser check of the page

## Resolution

_Open._
