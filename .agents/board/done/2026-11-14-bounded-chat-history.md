---
id: syn-061
title: memory: a chat turn loads only the latest messages it can use, in a stable order
type: bug
from: reviewer
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/database, apps/api/src/modules/memory, apps/api/test, docs]
allowed_shared: []
created: 2026-11-14
updated: 2026-11-14
---

## What

Every chat turn read the whole conversation from Postgres and then cut it to the history budget
(50 messages by default): long conversations got slower and heavier with every turn. Messages were
also ordered by `created_at` only, which ties for messages stored in one insert.

## Why / Context

Gap review (2026-11-14), item 5 of 5.

## Proposal or Ask

`chat_messages.ordinal` (identity, insertion order) with an index on (conversation, ordinal);
`messages(…, { latest })` returns the last N in order; a turn asks for `CHAT_HISTORY_MAX_MESSAGES`.

## Scope

**In scope:** the chat-turn read path and ordering. **Out of scope:** paging the conversation view.

## Validation

- integration (Postgres): messages saved in one insert keep their order, `latest: 2` returns the
  last two in order, another owner reads nothing, a turn with `maxMessages: 3` gets only the last three;
  unit: every turn asks the store for `{ latest: CHAT_HISTORY_MAX_MESSAGES }`

## Resolution

Landed in the `fix(memory)` commit on `main`. Migration `0016_chat_message_ordinal` adds
`chat_messages.ordinal` (`bigint` identity, so existing rows are numbered when it is added) and the index
`chat_messages_conversation_ordinal_idx`; both are `IF NOT EXISTS`. `ConversationStore.messages` takes
`{ latest }` (newest N by ordinal, returned oldest first) and orders by ordinal; `MemoryService`
asks for `history.maxMessages`. Docs: `docs/packages/memory.md`; memory updated.
