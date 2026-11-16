---
id: syn-067
title: chat: numbered citations, passage preview and source cards
type: feature
from: reviewer
to: web
priority: high
status: doing
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: []
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

Unit and e2e tests for the changed flow; screenshots for UI.

## Resolution

_Open._
