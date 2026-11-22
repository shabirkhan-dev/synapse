---
id: syn-090
title: console look v4 from the human's three references (calm widgets, mono numbers, workspace sidebar)
type: feature
from: human
to: all
priority: high
status: doing
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [packages/ui, apps/console, tests/e2e, docs/development/frontend-architecture.md]
allowed_shared: []
created: 2026-11-22
updated: 2026-11-22
---

## What

Use the human's three references (an "Acme Inc" widget board in light, its "Leads Report" in dark,
and a "fintrack" finance overview in dark) as the console's look: the same calm, clean surfaces,
taken over closely but on our own product, names and data.

## Why / Context

The human, 2026-11-22: "use these as reference exactly … use most of these and same calm clean ui ux".

## Proposal or Ask

- Sidebar: workspace row (mark, team name, ⇕, collapse), a "Search /" row, mono uppercase group
  labels, neutral grey pill for the current page, account card (avatar, name, email) at the foot.
- Mono (JetBrains Mono) for values, counts, table numbers, meta labels and section subtitles.
- Widgets: KPI strip with vertical rules, pill bar chart (muted bars, one orange highlight), horizontal
  bar rows, tinted status badges, inner "widget" cards.
- Accent: fintrack blue for primary actions; orange and sky blue for data.

## Scope

**In scope:** packages/ui tokens and primitives, apps/console shell and pages, e2e selectors that change.

## Validation

- lint, typecheck, console tests, e2e; screenshots light and dark before and after; contrast measured

## Resolution

_Open._
