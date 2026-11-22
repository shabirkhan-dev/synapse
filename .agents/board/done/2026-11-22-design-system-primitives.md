---
id: syn-091
title: one design system across the shadcn primitives (from the human's three references)
type: feature
from: human
to: all
priority: high
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: [syn-090]
branch: none
worktree: none
scope: [packages/ui, apps/console]
allowed_shared: []
created: 2026-11-22
updated: 2026-11-22
---

## What

Customize the shadcn primitives in `@synapse/ui` to the design system in the human's references,
so every page shares it (not a few widgets on top of stock components).

## Why / Context

The human on syn-090: "you make one two thing out of … i like the sidebar header even small detail
over all i want the system design system across our app; you need to customize the shadcn around the
design system in the pics".

## Resolution

Done. Commit: this change (`feat(ui): one design system across the shadcn primitives (syn-091)`).

- **Tokens:**
  - `--field` (white in light, `#1A1A1A` in dark).
  - Six tones (green, amber, red, blue, violet, orange). Each is text at 4.5:1 or better on its own
    tint in both themes (measured).
  - `shadow-card`, `shadow-control` and `shadow-pop`: a hairline lift in light, none in dark, and a
    soft deep popup shadow.
- **Button:**
  - 8px corners, 36px tall, 16px icons.
  - `default` is the blue with a top highlight; `outline` is bordered on the card colour (fintrack
    "Filter"); `ghost` (fintrack "Export"); `secondary` is a grey chip; `destructive` is tinted red.
- **Input, Textarea, Select trigger, Input group:** a bordered field on `--field`, with a blue focus
  ring at 15%.
- **Checkbox:** 5px corners, filled blue when checked.
- **Badge:**
  - A neutral chip and `outline`.
  - A mono `count` chip.
  - Tinted `success` / `warning` / `destructive` / `info` / `violet` / `orange` (fintrack "Paid /
    Pending / Overdue / On Track / In Progress").
- **Tabs:** icon and label, with the current tab in a grey chip (fintrack "Budget Board").
  `segmented` (a tray) and `line` variants.
- **Popups:**
  - Select, dropdown menu and popover: 12px corners, a border, `shadow-pop`, 8px item rows, mono
    uppercase group labels, mono shortcuts.
  - Tooltip: a dark chip.
  - Dialog and alert dialog: 16px corners, `p-6`, 16px titles, a lighter overlay.
  - Command: a borderless search row over mono group headings, 36px rows.
- **Card:**
  - 16px corners, `shadow-card`, 24px padding.
  - `CardTitle` takes a leading icon (18px, muted) and a count chip (fintrack "Bills & Fixed 3").
  - `CardFooter` is a muted meta row.
- **Alert:** 12px corners, 16px icon; `destructive` / `success` / `warning` tints.
- **Empty:** a bordered icon tile. **Skeleton:** 8px.
- **Console:**
  - Every card title has an icon. Count chips on Your documents, Members and Questions.
  - Badges use tones (Allowed, On and Verified green; Not verified amber; This device and Current
    blue).
  - `StatusDot` renders a tinted `Badge`.
  - `SegmentedControl` matches the tabs.
  - The account card and composer use tokens, with no hand-written `dark:` colours.
  - The email in the account menu is a plain line.
  - `/` opens the palette (unit test).

Validation:
- Screenshots in light and dark of 12 pages, plus the palette, the account menu, sign-in and a
  phone view.
- Contrast measured for the tones.
- lint, typecheck and architecture check clean; console tests 116 pass; e2e 29 pass.
