---
id: syn-069
title: console: light / dark / system switch and refined surfaces
type: feature
from: human
to: web
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/ui/src/styles, apps/console/src, apps/console/test, tests/e2e, docs]
allowed_shared: []
created: 2026-11-16
updated: 2026-11-16
---

## What

The human asked for both light and dark modes and shared Calesto and HockeyStack screenshots as
inspiration (near-black frame, lighter content panel, neutral active rows, counts in the sidebar,
a card-like composer). Dark mode only followed the OS.

## Why / Context

Phase 5 UI work, asked by the human on 2026-11-16.

## Proposal or Ask

A light/dark/system switch; depth by surface in dark mode; neutral current-page pill; larger nav
rows; a pending-approvals count; the chat composer as one card. Inspiration only: no copied brand,
assets or layouts.

## Scope

**In scope:** tokens, theme provider and switcher, shell, chat composer. **Out of scope:** ⌘K search
(its own card), per-user theme stored on the server.

## Validation

- contrast measured on the new surfaces: dark muted text 6.7:1+ on frame/panel/card/muted, accent
  5.4:1+ on the pill and cards; light accent icon 5.0:1 on the pill
- unit: the switcher is one radio group; Dark puts `dark` on `<html>` and stores it; Light swaps it
- e2e (new): with a dark system the page is dark; choosing Light survives a reload; System follows
  the system again. The teams spec caught a stale approvals list caused by the new sidebar count
  (cached query) — fixed with refetch on mount + 60 s polling; all 20 pass

## Resolution

Landed in the `feat(console)` commit on `main`. `next-themes` 0.4.6 (MIT, pinned), `ThemeProvider`,
`ThemeSwitcher` in the sidebar footer, `.dark` tokens, `navBadges` + `PendingApprovalsBadge`, card
composer. Docs: `frontend-architecture.md`; memory updated.
