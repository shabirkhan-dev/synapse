---
id: syn-030
title: Add memory: conversation history and long-term user memory
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-029]
branch: main
worktree: none
scope: [packages/memory, packages/database, apps/api/src/modules/chat]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
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

_Open._
