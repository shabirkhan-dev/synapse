---
id: syn-014
title: Create @synapse/generation (prompts, context, citations)
type: feature
from: human
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-010, syn-013]
branch: main
worktree: none
scope: [packages/generation]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Versioned prompts, context assembly within a token budget, citations; answers record `AnswerProvenance`.

## Why / Context

Prompts and answer assembly currently live in the API's rag/chat modules.

## Proposal or Ask

Move the RAG answer path; record model, prompt version and embedding version.

## Scope

**In scope:**

- `packages/generation/**`

**Out of scope:**

- agents (orchestration)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

Done in commit `feat(generation): add generation package with citations and provenance`.

- `@synapse/generation`: versioned prompts (`rag-answer@1`, `chat-assistant@1`), `buildContext` (token budget), `extractCitations`, `createAnswerGenerator`; 5 tests.
- `@synapse/core`: `AnswerProvenance` is now `chatModel`, `promptVersion`, `embeddingModel`, `chunkerVersion`, `usage`.
- `apps/api`: `RagService.answer` uses the generator; `/rag/query` returns `citations` + `provenance`; chat uses `CHAT_ASSISTANT_PROMPT`; `RAG_MAX_CONTEXT_TOKENS` (default 3000).
- Out of scope: persisting provenance (audit), structured output, streaming contract.
