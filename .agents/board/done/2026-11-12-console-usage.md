---
id: syn-049
title: Console usage: answers, tokens and cost by model and prompt version
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-048]
branch: main
worktree: none
scope: [apps/console, apps/api/src/modules/audit, packages/audit, packages/ui, tests/e2e]
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

Done in commit `feat(usage): answers, tokens and estimated cost by day and by model`.

- **`@synapse/audit`:** `AuditStore.usage` / `AuditLog.usage` (answered queries since a date, grouped by UTC day + chat model + prompt version + embedding model, token sums; optional actor). Drizzle `GROUP BY` on `audit_events` (owner/action/created_at index).
- **API:** `GET /audit/usage?days=` (1–90). `UsageService` fills every day, totals, groups by model, estimates cost from `AI_MODEL_PRICES` (`null` + `unpricedAnswers` when missing). Admins/owners: organization; members: their own answers.
- **Console `features/usage`** (`/usage`, sidebar Oversight): range toggles (7/30/90, `aria-pressed`), stat tiles (exact counts under compact ones; why there is no cost), CSS bar chart per dataviz rules with a per-day hover tooltip, a caption naming the busiest day and a table view, a by-model/prompt table ("No price"), empty state pointing to the Playground. Answers from the Playground now refresh usage and activity.
- **Bugs found:** (1) usage kept showing 0 after an answer (30 s stale cache) — the ask mutation invalidates usage + activity; the e2e failed before the fix. (2) At 320px the documents, activity and usage tables were cut off behind a sideways scroll with no cue and no keyboard access — the shared `Table` now fades, says so and becomes a focusable region when it overflows; a layout test fails on the old table. (3) "1 answers have no price" → plural rules.
- **Found, not fixed here:** streaming chat answers write no audit event or provenance (architecture rule 6) → syn-050 (high).
- **Validation:** audit package 3, API 148 with Postgres (service: window fill, cost with priced/unpriced, member scope; HTTP: answers vs retrieval-only, 422/401; SQL grouping by UTC day, action, actor, since), console 81, e2e 16 incl. `usage.spec.ts`; review in dark 1440px (seeded 64 answers over 3 weeks) and light 320px.
