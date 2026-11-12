---
id: syn-050
title: Record streaming chat answers with provenance (architecture rule 6)
type: bug
from: pm
to: web
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-049]
branch: main
worktree: none
scope: [apps/api/src/modules/chat, apps/api/src/modules/audit, apps/api/src/modules/rag, packages/audit, apps/console/src/features/usage, tests/e2e]
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

Done in commit `fix(chat): record every chat answer with its provenance`.

- `@synapse/audit`: `chat.message.answered`; `usage` now reads both answer actions and returns `action` per group (SQL groups by it).
- `ChatService` records the event from `streamText`'s `onEnd` (total usage) and `onAbort` (usage summed over finished steps, `finishReason: "aborted"`): owner = active organization, actor = user, subject = stored conversation, request id, `data { finishReason, steps, tools }`, provenance = `provider:model` from the gateway's chat info, `chat-assistant@n`, `RagService.versions` (embedding model, chunker), tokens. The reply is already sent, so a failed write is logged, not thrown (documented; the RAG path keeps failing the request).
- Usage: `models[].source` (`rag` | `chat`), console "Source" column (Playground / Chat); activity says "Answered in chat".
- **Validation:** audit package 3; API 152 with Postgres (recorded once with full provenance and conversation subject, tool answer records tools + summed tokens of 2 steps and shows in usage as chat, a stopped stream is recorded with finished steps, a failing audit store leaves the stream intact; SQL groups chat separately); console 81; e2e 16 (chat reply appears in Usage).
