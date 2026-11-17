---
id: syn-076
title: console: choose documents in chat
type: feature
from: reviewer
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: []
allowed_shared: []
created: 2026-11-17
updated: 2026-11-17
---

## What

The chat API scopes a turn to chosen documents (syn-070) but the chat page has no picker.

## Why / Context

Phase 5 follow-up (roadmap rows after syn-075).

## Proposal or Ask

A "Search in" picker above the composer (the Playground's component), kept per conversation in the page; the turn sends documentIds; the reply says which documents it searched.

## Scope

**In scope:** the above. **Out of scope:** anything else.

## Validation

Console unit test (sent documentIds), e2e (a scoped chat turn finds only the chosen document).

## Resolution

Landed in `feat(console): choose documents in chat` (on `main`).

- `DocumentScope` moved to `components/shared` (a `max` prop), used by the Playground and chat.
- Chat: "Search in" at the top of the thread; every turn (and regenerate) sends `documentIds`.
  The scope is page state, not stored with the conversation.

Validation: console 105 pass (new: a chosen document goes with the turn); e2e: a turn narrowed to
one document cites only it.
