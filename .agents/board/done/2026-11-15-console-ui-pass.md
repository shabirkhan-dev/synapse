---
id: syn-065
title: console: UI/UX pass — accent, page headers, empty states, brand, chat and documents layout
type: feature
from: human
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/ui/src/styles, packages/ui/src/components/empty.tsx, apps/console/src, apps/console/test, tests/e2e/specs, docs, .agents]
allowed_shared: []
created: 2026-11-15
updated: 2026-11-15
---

## What

Make the console clean, modern and consistent. A `better-interface` review of every page (desktop
light and dark, phone) found it correct but unfinished: all grayscale with no accent or brand, small
page titles (`text-lg`) written separately in 13 containers, bare-text empty states, a plain auth
card, a pure-white chart bar in dark mode, a long single-column add-document form, and a chat
composer floating mid-page.

## Why / Context

Asked by the human (2026-11-15): "work on the ui ux … make it clean modern and amazing".

## Proposal or Ask

Fix it at the source: theme tokens, then shared components, then the two densest pages.

## Scope

**In scope:** tokens, `PageHeader`, `EmptyState`, `BrandMark`, shell top bar, auth layout, usage
tiles, documents add form, chat layout. **Out of scope:** new features, a dark-mode toggle.

## Validation

- contrast measured from the OKLCH tokens (script, sRGB gamut checked): primary text 6.0:1 (light),
  6.4:1 (dark); focus ring 5.7:1+ on every surface; current sidebar page 9.0:1 / 10.7:1
- screenshots of every page before and after, desktop light + dark and 390px phone
- console unit tests 89 pass; e2e 19 pass (incl. 320px layout); lint, typecheck, architecture

## Resolution

Landed in the `feat(console)` commit on `main`. `globals.css`: indigo `--primary` / `--ring` /
`--sidebar-primary`, tinted `--sidebar-accent`, chart ramp. `components/shared/page-header.tsx`
(13 pages), `empty-state.tsx` (on shadcn `Empty`, added with the CLI), `brand-mark.tsx`. Top bar
shows section / page. Upload and paste sit side by side on `lg`. The chat composer docks at the
bottom and replies carry the mark. The "Nothing is waiting for a decision" copy lost its full stop
(tests updated). Docs: `docs/development/frontend-architecture.md`.
