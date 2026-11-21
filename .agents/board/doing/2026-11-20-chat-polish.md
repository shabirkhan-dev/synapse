---
id: syn-086
title: chat: rename, keep stopped answers, earlier versions on regenerate
type: feature
from: human
to: all
priority: normal
status: doing
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [packages/database, packages/memory, apps/api chat, apps/console chat, tests/e2e]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-21
---

## What

Rename a conversation; a stopped answer is saved; regenerating keeps the earlier reply as a version you can switch back to.

## Why / Context

Gap review 2026-11-19 (item 7).

## Proposal or Ask

API: `PATCH /chat/conversations/:id` (title), save partial replies on abort, versions for the last reply. Console: rename in the list, version switcher. Done with API + console tests and an e2e.

## Scope

**In scope:** packages/database, packages/memory, apps/api chat, apps/console chat, tests/e2e.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

_Open._
