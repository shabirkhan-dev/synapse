---
id: syn-070
title: rag: ask about chosen documents (Playground, chat, API filter)
type: feature
from: reviewer
to: backend
priority: high
status: open
assignee: none
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

Every question searches the whole workspace; there is no way to ask about one document or a few
(Onyx assistants and Perplexity focus modes scope knowledge; RAGFlow datasets do the same).

## Why / Context

Phase 5 review (`.agents/plans/phase-5-rag-quality.md`), step 4.

## Proposal or Ask

`documentIds` filter on `/rag/query` (and the chat search tool), applied in both vector and keyword
search before ranking, owner-scoped; Playground document picker; "Ask about this document" on the
document page.

## Scope

**In scope:** API filter, Playground picker, document-page shortcut. **Out of scope:** saved
collections.

## Validation

Postgres: filtered searches return only chosen documents and never another owner's; e2e for the
document-page shortcut.

## Resolution

_Open._
