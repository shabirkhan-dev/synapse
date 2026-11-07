---
id: str-rabtx-toggle
title: Build the Rabtx Toggle and its docs page
type: feature
from: human
to: ui-ux
priority: high
status: done
assignee: ui-ux
reviewer: human
parent: str-rabtx-checkbox
depends_on: []
branch: agent/ui-ux/rabtx-toggle
worktree: ../starter-worktrees/agent/ui-ux/rabtx-toggle
scope:
  - packages/rabtx/**
  - apps/web/src/app/ui/**
  - apps/web/e2e/ui-toggle.spec.ts
  - DESIGN.md
  - .agents/board/**
allowed_shared:
  - apps/web/**
  - DESIGN.md
created: 2026-10-08
updated: 2026-10-08
---

## What

Toggle (Figma `6:103`), an on/off switch, with a docs page at `/ui/toggle`.

## Why / Context

Owner: Toggle next. It uses the `switch` spring from the beUI table, a good test of CSS-only motion.

## Proposal or Ask

- Native checkbox with `role="switch"`; track, thumb, hit area and colors in `toggle.css`.
- Server-safe component; children render a wrapping `<label>`.
- New `--rx-accent-soft` token for the disabled-on track.

## Scope

**In scope:** the paths in `scope`.

**Out of scope:** Radio, Setting Row, Solid and native versions.

## Validation

- `bun run lint`, `typecheck`, `naming:check`, `architecture:check`, `format` pass.
- 48 Playwright tests pass against the dev server (toggle 8, checkbox 7, select 6, badge 4, card 4,
  button 5, input 5, textarea 5, field 3, home 1): switch role, label and Space, 28x16 track, exact
  Figma track colors, 12px thumb sliding 12px, 24px target, disabled, controlled example, focus
  ring, Sharp radius.
- Checked in Chromium at 3x: light, dark, Sharp.
- Dev server run with `next/font` stubbed locally; the stub was not committed.

## Resolution

Toggle built to the Figma SVG values.
