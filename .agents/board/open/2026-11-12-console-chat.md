---
id: syn-044
title: Console chat: streaming answers with stored conversations
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-043]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

A chat page on the API's streaming `/chat` (tool calls such as `searchDocuments`, stored
conversations with `{ message, conversationId }`, long-term facts) — the playground is one-shot.

## Why / Context

Chat with memory is built in the API (syn-030) but nobody can use it from the console.

## Proposal or Ask

`features/chat`: stream the reply as it arrives (the API client gains a streaming call), list and
resume conversations, show tool calls (searched documents) and errors mid-stream; e2e with the
fake model server.

## Scope

**In scope:**

- chat page, conversation list, streaming in `lib/api`, tests, e2e

**Out of scope:**

- editing or deleting conversations, voice, attachments

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

_Open._
