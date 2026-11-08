---
id: syn-030
title: Add memory: conversation history and long-term user memory
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-029]
branch: main
worktree: none
scope: [packages/memory, packages/database, apps/api/src/modules/chat]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-08
---

## What

Chat is stateless: the client resends every message, and nothing is remembered across conversations.

## Why / Context

Planned `memory` package (conversation, semantic, episodic). Chat and agent graphs need history
that survives reloads, and users expect the assistant to remember stated preferences.

## Proposal or Ask

Conversations and messages stored per owner (load the last N within a token budget); a small
long-term memory of facts the user asked to remember, retrieved by vector similarity and shown
to the model as untrusted context; delete-my-memory endpoint.

## Scope

**In scope:**

- `packages/memory`, tables, chat wiring, docs

**Out of scope:**

- automatic summarization of long histories (later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a conversation reloads after a restart; memory is owner-scoped (integration test)

## Resolution

Done in commit `feat(memory): store chat conversations and long-term user facts`.

- `@synapse/memory` (new): `selectHistory` (newest within a token/message budget, never starting with an assistant reply), `createLongTermMemory` (remember/recall/list/forget per owner, same text once, recall above a similarity floor), `formatRecalledFacts` (framed as data); 5 tests.
- `@synapse/database`: `chat_conversations`, `chat_messages` (client message ids, insert-or-skip), `memory_facts` (vector, exact per-owner search) — migration `0010`.
- API `memory` module: conversations list/get/delete, facts list/add/delete, `DELETE /memory`; audited (`memory.*` actions added to `AUDIT_ACTIONS`).
- Chat: `{ message, conversationId? }` stores the conversation (history replayed, reply saved in `onFinish`, `x-conversation-id` header, exposed via CORS); `{ messages }` stays stateless; recalled facts in the system prompt; new `rememberFact` tool. Config `CHAT_HISTORY_MAX_TOKENS` (6000) / `CHAT_HISTORY_MAX_MESSAGES` (50), added to `.env.example`, compose and Doppler `dev`.
- **Validation:** 5 API tests (history replayed on the second turn, other users get 404, stateless chat stores nothing, mixed bodies 422, model-saved fact recalled as data in a later chat, facts/forget-everything endpoints); 2 Postgres tests (a conversation reloads in a fresh service in order and only for its owner; facts recalled by similarity per owner, deduplicated, forgotten). Real-server smoke (built bundle): memory endpoints 200.
- **Not done:** summarizing long histories, re-embedding facts after a model change, console chat UI.
