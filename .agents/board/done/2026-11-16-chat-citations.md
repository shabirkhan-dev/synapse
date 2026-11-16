---
id: syn-067
title: chat: numbered citations, passage preview and source cards
type: feature
from: reviewer
to: web
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [apps/api/src/modules/chat, packages/generation, packages/ui/src/components/popover.tsx, apps/console/src, tests/e2e, docs]
allowed_shared: []
created: 2026-11-16
updated: 2026-11-16
---

## What

Chat names document titles while the Playground cites numbered passages; neither shows the cited passage where the citation is.

## Why / Context

Phase 5 review (`.agents/plans/phase-5-rag-quality.md`), asked by the human: "keep improving the UI/UX
and make it the ultimate RAG system".

## Proposal or Ask

The chat search tool numbers its passages; the chat prompt cites [n]; the console turns [n] into a button that previews the passage, and lists sources as cards.

## Scope

See the plan; one card per commit.

## Validation

- api: citation numbers 1,2 then 3,4 across two searches in one reply
- console: a cited reply renders **$19** bold, `[1]` opens the passage with its source link, two
  cited passages of one document make one source card `Shipping[1][2]`, an uncited document has
  none, an unknown `[9]` stays text
- e2e: the stand-in model cites `[1]`; the chat spec opens it (dialog shows the passage, Escape
  closes it) and finds `Refund policy[1]` under the answer; all 19 pass

## Resolution

Landed in the `feat(chat)` commit on `main`. `searchDocuments` results carry `citation`;
`chat-assistant@3`; console `CitationPopover` (shared, on the shadcn Popover added with the CLI),
`features/chat/utils/citations.ts` (Zod-checked tool output), `SourceCards`. Docs: endpoints,
generation, testing, frontend architecture.
