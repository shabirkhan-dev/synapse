---
id: syn-075
title: console: suggested follow-ups, copy, regenerate; command palette
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

Answers end the flow: no suggested next questions, no copy, no regenerate; every page is reached
through the sidebar only.

## Why / Context

Phase 5 review, step 7 (Perplexity follow-ups; ⌘K navigation in most modern consoles).

## Proposal or Ask

Copy and regenerate on chat replies and the Playground answer; suggested follow-up questions after
an answer; a ⌘K / Ctrl+K command palette (pages, recent conversations, documents).

## Scope

**In scope:** the four interactions. **Out of scope:** keyboard shortcuts beyond the palette.

## Validation

Console unit tests; e2e for the palette and a follow-up.

## Resolution

Landed in `feat(console): command palette, copy, regenerate and follow-up questions` (on `main`).

- ⌘K / Ctrl+K palette (shadcn `command` + our Dialog, titled): pages, "New chat", 8 recent
  conversations and documents, loaded on first open; Search button in the top bar.
- Copy on chat replies and the Playground answer; chat Regenerate on the last reply of a stored
  conversation (API `{ conversationId, regenerate: true }`, the store deletes after the last user
  message, audit `regenerated: true`); Playground "Ask again" with the same passages and scope.
- Follow-ups: `suggestFollowUps` (`follow-ups@1`, `@synapse/generation`), `POST /rag/follow-ups`
  (questions budget, guardrail-checked suggestions), shown as "Ask next" in chat and the Playground.

Validation: generation 4 new; API regenerate (replaces the reply, model sees the question not the old
reply, audited; 422/404 shapes) and follow-ups (cap, injected suggestion dropped, empty on junk, 422);
console palette 2, chat 2, Playground 1 new; e2e answer-flow (Ctrl+K, copy to clipboard, follow-up,
regenerate survives a reload); screenshots light and dark.
