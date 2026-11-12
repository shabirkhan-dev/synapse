---
id: syn-047
title: Console shell: sidebar and inset content area, dark mode from the system
type: feature
from: human
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-045]
branch: main
worktree: none
scope: [apps/console, packages/ui, tests/e2e]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

Replace the top-bar header with a modern app shell like the reference the human shared: a left
sidebar (organization picker at the top, grouped navigation with icons, the signed-in user at the
bottom) and the page in a rounded, inset content area. Dark mode follows the system.

## Why / Context

Seven nav links no longer fit a top bar; the human asked for a sidebar + content layout.

## Proposal or Ask

shadcn `sidebar` (Base UI, inset variant, offcanvas drawer on phones, Ctrl/⌘+B), nav groups
Workspace / Oversight / Organization, org switcher in the sidebar header, user row with Account and
Sign out; `prefers-color-scheme` dark tokens; e2e and interface review in light and dark.

## Scope

**In scope:**

- app shell, theme switching mechanism, tests

**Out of scope:**

- a theme toggle, search, recent items in the sidebar

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

Done in commit `feat(console): sidebar shell with an inset content area and system dark mode`.

- shadcn `sidebar` + `sheet`, `tooltip`, `separator`, `skeleton`, `use-mobile` (CLI; one generated `no-shadow` warning fixed). Inset layout like the reference: organization picker (initial tile + name) in the sidebar header, grouped nav with icons and `aria-current`, "Account" + email and Sign out in the footer, top bar with the toggle and page name, the verify-email notice above the page.
- Dark mode now follows `prefers-color-scheme` (the `.dark` block became a media query; one mechanism). Light `--sidebar-ring` 0.708 → 0.556 (focus ring 2.59:1 → 4.73:1 on the sidebar).
- Review (light, dark, 390px drawer): contrast pairs computed from tokens clear 4.5:1 (text) / 3:1 (focus) in both themes; drawer closes on Escape and on navigation; the account row shows its label in its name (no `aria-label` mismatch).
- e2e: layout spec rewritten for the drawer (320px, all links + Sign out + current page) plus "drawer link closes the drawer"; nav clicks use exact names (the account link's name contains the email); 12 tests pass.
