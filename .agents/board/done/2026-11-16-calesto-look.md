---
id: syn-072
title: console: closer to the Calesto reference (account menu, page pill, chat cards, floating composer)
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
scope: [packages/ui/src/components/dropdown-menu.tsx, apps/console/src, apps/console/test, tests/e2e, docs]
allowed_shared: []
created: 2026-11-16
updated: 2026-11-16
---

## What

"Go, I want the UI/UX closer to this" — three Calesto screenshots: an airy sidebar with an unlabeled
main group and one account row (avatar, name, settings), a page tab, message cards, collapsible
"Ran command ›" steps, and a floating composer with a round send button.

## Why / Context

Asked by the human on 2026-11-16, after syn-069. Inspiration only: no Calesto name, assets or layout
copied.

## Proposal or Ask

Account row + menu (theme, Sign out, account) and a settings gear; no heading on the main group;
page pill in the top bar; soft accent glow in the dark panel; chat: user message card, larger reply
text, search step as an expandable row, floating composer with round icon send/stop.

## Scope

**In scope:** shell, chat. **Out of scope:** a Sources side panel (the page width is shared with the
conversation list), a model picker (one model per deployment).

## Validation

- unit: the account menu shows you, links to settings, signs out, and sets the theme (Base UI menu
  items need the pointer sequence in happy-dom: `press()` helper); tool row and message tests pass
- e2e: Sign out and theme go through "Account menu"; chat sources open from the search row; at 320px
  the account settings link is the current page on `/account` (caught by the layout spec); 20 pass
- screenshots dark, with the menu open

## Resolution

Landed in the `feat(console)` commit on `main`. shadcn `dropdown-menu` (CLI), `AccountMenu`
(replaces `ThemeSwitcher`), shell header/footer/nav, `ToolCall` as `<details>`, composer icon buttons.
