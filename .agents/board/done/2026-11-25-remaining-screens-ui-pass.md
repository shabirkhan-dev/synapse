---
id: syn-093
title: UI/UX pass on every screen other than Chat
type: chore
from: human
to: web
priority: normal
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: [syn-091, syn-092]
branch: main
worktree: none
scope: [apps/console/src, packages/ui/src, tests/e2e/specs]
allowed_shared: [docs/development/frontend-architecture.md, .agents/memory, .agents/plans/roadmap.md]
created: 2026-11-25
updated: 2026-11-25
---

## What

The human asked to "work on remaining parts of ui ux as well" after the chat redesign (syn-092).
Review Documents, the document page, Playground, Retrieval, Evaluations, Agents, Approvals,
Activity, Usage, System, Team, Account and the signed-out pages in light, dark, desktop and 390px,
then fix what the review finds.

## Why / Context

syn-090/091 moved the look into the primitives; the screens built before still had leaf-level
problems that only show with real content and at phone width.

## Proposal or Ask

`better-interface` review over screenshots of every screen (throwaway Playwright spec, not
committed), fix the findings in the project's tokens and primitives, keep e2e + axe green.

## Scope

**In scope:** console components and containers above, `@synapse/ui` table and tokens, tests.

**Out of scope:** Chat (syn-092), new features.

## Validation

- `bun run lint`, `bun run format`, console + ui typecheck, `bun run architecture:check`
- `bun --cwd=apps/console test`: 121 pass
- `bun run test:e2e`: 33 pass (accessibility spec included)
- Screenshots before/after, light/dark, 1440 and 390 wide

## Resolution

Findings and fixes:

- HIGH — Evaluations: the question's Delete button was clipped at the table edge (desktop and
  phone) by a `-me-3` that made the table scroll; also Team's Remove. Margins removed; the table
  primitive no longer sets mono on right-aligned cells that hold a button.
- HIGH — Truncated values with no way to the full text: retrieval passage headings, Agents
  run questions, Activity details, Documents sources now wrap; sidebar Recent titles get `title`.
- HIGH — axe (light account menu): muted text on the sidebar's current-page pill was 4.47:1.
  Light `--muted-foreground` #6B6B6B → #666666 (5.5:1 panel, 4.8:1 pill).
- MEDIUM — Activity on phones hid "What" behind a sideways scroll: When/Who/Detail fold under it.
  Documents hides Source on phones.
- MEDIUM — Playground passages and Retrieval passages were drawn two ways: one card (linked
  heading path, chunk, text, then "Meaning #1 · Keywords #2 · score"); the question form puts
  Passages left and Ask right with the Ctrl/⌘ + Enter hint.
- MEDIUM — The document page had its own smaller heading and a back link duplicating the
  breadcrumb: now `PageHeader` (chunk count as meta, source in the description); a missing
  document's error offers "Back to Documents".
- LOW — Team description sat apart from the title (now `PageHeader` text); out-of-date chunks
  use the warning badge and the chunk label no longer starts with a stray "·"; a zero bar in
  BarRows draws nothing; System's cards no longer stretch to the tallest neighbour.

Not changed: signed-out pages, Approvals, Usage and Account had no findings worth a change.
Not verified: a screen-reader pass (manual).
