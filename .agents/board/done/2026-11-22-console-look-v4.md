---
id: syn-090
title: console look v4 from the human's three references (calm widgets, mono numbers, workspace sidebar)
type: feature
from: human
to: all
priority: high
status: done
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

Done.

- **Tokens:**
  - Light: a grey frame `#F5F5F5`, a `#FBFBFB` panel, white 16px cards with a faint shadow, text
    `#1C1C1C` / `#6B6B6B`.
  - Dark: `#1A1A1A` frame and panel, `#1E1E1E` cards, `#2A2A2A` borders.
  - Actions: one blue `#3556F5`, white text at 5.5:1 in both themes. Blue text uses `--link`
    (`#7D93FF` in dark).
  - Status: `--success` and `--warning`.
  - Data: `--chart-1…5` in a fixed order (orange, sky, amber, teal, grey). It passes the dataviz
    `validate_palette.js` in both themes (dark uses deeper steps), plus a quiet bar colour
    `--chart-muted`.
- **Sidebar:**
  - A workspace row: product mark, team name with ⇕, collapse button.
  - A "Search /" row. `/`, ⌘K and Ctrl+K all open the palette.
  - Mono uppercase group labels and a grey pill for the current page.
  - A Recent group: three conversations and two documents, with mono `CHAT` / `DOC` tags and icons.
  - An account card: avatar, name, address, settings.
- **Header:** the breadcrumb is `Section › [icon] Page`. Its sidebar button shows only on phones or
  when the sidebar is collapsed.
- **Shared widgets:**
  - `StatStrip`: a KPI row with rules; on Usage and System.
  - `BarRows`: answers by source on Usage.
  - `TickMeter`: evaluation scores.
  - A pill bar chart on Usage: quiet bars, the busiest or hovered day orange. The tooltip and the
    table are kept.
  - `StatusDot` is now a tinted pill; text is 4.5:1 or better.
  - `PageHeader` `meta` gives the Documents count.
- **Mono:** table headers are mono capitals, right-aligned cells are mono numbers, and the Agents
  setting labels are mono capitals.
- **Behaviour:** the Documents page refetches its list when opened, because the Recent group keeps it
  cached. e2e title links are scoped to `main`, because Recent repeats them.

Validation:
- Screenshots in light and dark, before and after, for nine pages.
- Contrast measured for every new text/background pair.
- lint, typecheck and architecture check clean; console tests 115 pass.
- e2e: all 29 specs pass. two-step timed out once under load, then passed alone and in the full
  re-run.

Commit: f93a71e (`feat(console): look v4 after the human's references (syn-090)`).
