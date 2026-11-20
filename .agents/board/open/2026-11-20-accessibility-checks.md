---
id: syn-089
title: automated accessibility checks on every page
type: chore
from: human
to: all
priority: normal
status: open
assignee: none
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [tests/e2e, apps/console, packages/ui]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-20
---

## What

An e2e spec runs axe-core on every page in light and dark and fails on serious or critical violations.

## Why / Context

Gap review 2026-11-19 (item 7): accessibility was reviewed by hand only.

## Proposal or Ask

`@axe-core/playwright` in `tests/e2e`; fix what it finds. A screen-reader pass stays manual.

## Scope

**In scope:** tests/e2e, apps/console, packages/ui.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

_Open._
