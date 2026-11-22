---
id: syn-087
title: palette searches everything; shell shows while the session loads
type: feature
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
scope: [apps/api rag/chat, apps/console command-palette, app shell, session gate]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-21
---

## What

⌘K searches all documents and conversations on the server, and workspace pages show the sidebar and header while the session is restored instead of a blank page.

## Why / Context

Gap review 2026-11-19 (item 7).

## Proposal or Ask

`q` on the documents and conversations list endpoints; palette debounced server search; shell rendered by the gate with skeletons. Done with tests and an e2e.

## Scope

**In scope:** apps/api rag/chat, apps/console command-palette, app shell, session gate.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

_Open._
