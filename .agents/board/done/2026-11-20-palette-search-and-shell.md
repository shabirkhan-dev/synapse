---
id: syn-087
title: palette searches everything; shell shows while the session loads
type: feature
from: human
to: all
priority: normal
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [apps/api rag/chat, apps/console command-palette, app shell, session gate]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-22
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

Done. Commit: this change (`feat(console): search every title from the palette; frame while the session loads (syn-087)`).

- **API:** optional `q` on `GET /rag/documents` and `GET /memory/conversations`. It matches titles
  case-insensitively with ILIKE; `%`, `_` and `\` are escaped by `containsPattern` in
  `shared/utils`. Documents keep the reader filter (ADR-0008). Both in-memory stores match the same
  way.
- **Console:** `documentsService.search` and `chatService.search`, `useDocumentSearchQuery` and
  `useConversationSearchQuery`, with `search` query keys. The palette's input is controlled: from
  two characters (200 ms debounce) it shows server results in place of the recent lists, and
  "Searching…" while they load. The text clears when the palette closes.
- **Loading frame:** while the session restores, `SessionGate` renders `AppShell pending`, which
  shows the sidebar's pages and header, a `PageSkeleton` announced as "Loading your workspace…", and
  a skeleton account card. The switcher, search, Recent and badges wait, because they call the API.

Validation:
- API: `list-search.test.ts`, plus Postgres tests for both repositories (case, escaped `%` and `_`,
  per owner).
- Console: palette server search, `/` shortcut, and `AppShell pending` (pages and an outline, no
  account menu). 118 pass.
- e2e: `search-and-loading.spec.ts` (a document older than the latest eight found by typing; the
  frame shown while a held refresh is pending), plus answer-flow and layout.
