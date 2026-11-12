---
id: syn-050
title: Record streaming chat answers with provenance (architecture rule 6)
type: bug
from: pm
to: web
priority: high
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-049]
branch: main
worktree: none
scope: [apps/api/src/modules/chat, packages/audit]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

`POST /chat` streams answers but writes no audit event: no chat model, prompt version
(`chat-assistant@n`), embedding model, token usage or request id is recorded, so chat answers are
not traceable and do not show in Usage.

## Why / Context

Architecture rule 6: every answer records the model, prompt version and embedding version. Found
while building Usage (syn-049).

## Proposal or Ask

Record `chat.message.answered` (new audit action) in the stream's `onFinish` with provenance from
the gateway (chat model, `CHAT_ASSISTANT_PROMPT` version, embedding model and chunker version when
`searchDocuments` ran, summed usage across steps), conversation id as subject. Decide and document
what happens when the write fails after the stream was sent (the RAG path fails the request; a
stream cannot). Count chat answers in Usage (action filter becomes a list) with a "source" column.

## Scope

**In scope:**

- audit write with provenance, usage counts chat, tests (stream finished, aborted, tool steps)

**Out of scope:**

- per-message feedback in chat

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

_Open._
