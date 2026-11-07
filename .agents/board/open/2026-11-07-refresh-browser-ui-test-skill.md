---
id: syn-019
title: Update the vendored browser-ui-test skill for the bare console
type: chore
from: human
to: ui-ux
priority: low
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-018]
branch: main
worktree: none
scope: [.agents/skills/browser-ui-test]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Its description still mentions console Playwright e2e tests that were removed.

## Why / Context

Stale skill descriptions mislead agents.

## Proposal or Ask

Update when the console gets its first e2e test (syn-018).

## Scope

**In scope:**

- `.agents/skills/browser-ui-test/SKILL.md`

**Out of scope:**

- new tests

## Validation

- skill text matches the repo

## Resolution

_Open._
