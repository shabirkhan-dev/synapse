---
id: syn-025
title: Add the orchestration package (LangGraph graphs with checkpoints)
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-024]
branch: main
worktree: none
scope: [packages/orchestration, packages/adapters]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Multi-step agent flows (tool use, retries, human approval) have no home; streaming chat loops tools inline.

## Why / Context

One owner per capability: LangGraph lives in `orchestration`, checkpoints in Postgres.

## Proposal or Ask

`@synapse/orchestration` with graph state, routing and Postgres checkpoints; first graph: RAG answer with a retry on missing citations.

## Scope

**In scope:**

- `packages/orchestration`, checkpoint storage, docs

**Out of scope:**

- human-oversight approvals (own card later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a graph resumes from its last checkpoint after a simulated crash

## Resolution

Done in commit `feat(orchestration): add langgraph rag answer graph with postgres checkpoints`.

- `@synapse/orchestration` (new): `createRagAnswerGraph({ ports, maxAttempts, checkpointer })` → `run(input, threadId?)` / `resume(threadId)`. retrieve → generate → retry once when the answer cites nothing → end; nothing retrieved ⇒ no model call; steps bounded. Ports keep the package free of retrieval/generation imports. LangGraph JS pinned: `@langchain/langgraph` 1.5.2, `@langchain/core` 1.2.20, `@langchain/langgraph-checkpoint` 1.2.1 (newest releases were days old).
- `@synapse/adapters/checkpointer`: `createPostgresCheckpointer` (`@langchain/langgraph-checkpoint-postgres` 1.1.2, `langgraph` schema).
- `@synapse/generation`: `RAG_ANSWER_CITED_PROMPT` (`rag-answer-cited@1`).
- API: `RagService.answer` runs through the graph (no checkpointer, in-request); the retry uses the stricter prompt and provenance names the prompt that produced the answer.
- `architecture:check`: `@langchain/*` only in `orchestration` and `adapters` (fixture test extended).
- **Validation:** 6 graph unit tests (retry, cap, no passages, crash → resume without re-retrieving, threads independent); Postgres test: a run killed during generation is resumed by a *new* checkpointer connection and graph, which never retrieves and finishes with the stored passages. API: 2 new tests (retry with the stricter prompt; still uncited → returned as is); tracing test confirms LLM spans stay children of the request span through LangGraph. API bundle (4.0 MB) builds and boots.
- **Not done:** no job uses checkpointed runs yet; agent tools, approvals (`human-oversight`) and audit events are later cards.
