---
id: syn-079
title: console detail polish — nothing looks cheap (better-* skills)
type: chore
from: human
to: ui-ux
priority: normal
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: [syn-078]
branch: main
worktree: none
scope: [packages/ui/src, apps/console/src, tests/e2e/specs, docs/development/frontend-architecture.md]
allowed_shared: []
created: 2026-11-19
updated: 2026-11-19
---

## What

A detail-level pass over every console screen with the `better-*` interface skills (ui,
typography, layout, colors, accessibility, writing), keeping the syn-078 spec (Inter, #1C1C1C /
#E5E5E5 / #A1A1A1, 6/8/12px radii, HugeIcons).

## Why / Context

The human: "pay attention to details and make sure nothing looks cheap".

## Proposal or Ask

Screenshot every page (light, dark, phone), list the details that look unfinished (spacing,
alignment, icon sizes and strokes, radii, hover/press states, number alignment, empty states,
copy), fix them in shared components first.

Done when the ranked findings are fixed, console tests and e2e pass, and before/after shots exist.

## Scope

**In scope:**

- `packages/ui/src`, `apps/console/src`, e2e specs that name changed elements, frontend docs.

**Out of scope:**

- API behaviour; new features.

## Validation

- `bun run lint`, `bun run typecheck`, console tests, `bun run test:e2e`, `architecture:check`.
- Before/after screenshots of every page.

## Resolution

Landed in the commit that moved this card (`feat(ui): …syn-079`). Before/after shots of every page
(light, dark, phone) were reviewed with the better-ui, typography, layout and accessibility rules.

- **Documents:** the three side-by-side add forms became `Tabs` (Upload files · Paste text · Web
  page, panels kept mounted); title and source share a row; the drop zone has an icon tile; the
  page is ~30% shorter on a phone. The web field is labelled "Page address".
- **Type:** JetBrains Mono (self-hosted) for ids and model names, normal tracking (the body's
  −0.15px crowded fixed-width glyphs); card descriptions stop at 65 characters a line.
- **Tables:** text flush with the card's edge (it sat 8px in), muted 13px headers, tabular
  numbers, no hover on rows that do nothing; Usage merges tokens into "in / out" so cost fits;
  Agents' label column is 9rem so model ids stay on one line, and its runs table fits.
- **Controls:** buttons press to 0.96 only with motion allowed and transition named properties;
  primary hover 90% (was 80%); ghost buttons that end a row line up (`-me-3` / `-ms-3`);
  segmented control and tabs use 6px inside an 8px track; Playground's Ask matches the input
  height; Retrieval's "Passages per mode" fits on one line; chat's delete icon shows on hover/focus
  where there is a pointer (always on touch).
- **Shared:** `Disclosure` (chevron, not the browser triangle) for "How this answer was made" and the
  usage table; one citation-mark style in chat and the Playground (the Playground used `[1]`
  superscripts); usage chart has dashed guide lines with its scale; overlays and scrolling lists
  use `overscroll-contain`.

Validation: console 106 pass; `bun run test:e2e` 24 passed; lint, typecheck, architecture and
naming checks pass.

