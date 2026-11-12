---
id: syn-049
title: Console usage: answers, tokens and cost by model and prompt version
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-048]
branch: main
worktree: none
scope: [apps/console, apps/api/src/modules/audit]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

A Usage page: for the active organization, answers per day and token use (and cost when
`AI_MODEL_PRICES` is set) grouped by chat model, prompt version and embedding model, from the
provenance stored with every answer in `audit_events`.

## Why / Context

Phase 3 "Console features: … observability". Every answer records its provenance; nobody can see it
in aggregate today without Langfuse.

## Proposal or Ask

API: `GET /audit/usage?days=30` (owner-scoped SQL aggregate over `rag.query.answered`, admins see the
organization, members their own). Console `features/usage`: totals, a per-day chart, a by-model
table; tests, e2e, interface review (dataviz rules).

## Scope

**In scope:**

- usage endpoint + page, tests, e2e

**Out of scope:**

- Langfuse links per answer, budgets and alerts

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

_Open._
