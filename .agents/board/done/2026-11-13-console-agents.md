---
id: syn-055
title: console: agents — the assistant's model, prompt, tools and guardrails, and its recent runs
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [apps/api/src/modules, apps/console/src/features, tests/e2e, docs]
allowed_shared: []
created: 2026-11-13
updated: 2026-11-13
---

## What

An Agents page: what the chat assistant and the answer graph run on (chat and fallback model,
prompt versions, embedding model, reranker, tools and whether each needs approval, guardrail
limits), and their recent runs with the tools each used, tokens and model.

## Why / Context

Roadmap Phase 3 "Console: agents". The configuration lives in env and code; runs are in
`audit_events` (`chat.message.answered`, `rag.query.answered` with provenance and `data.tools`).

## Proposal or Ask

API `GET /agents` (configuration, no secrets) and `GET /agents/runs` (recent answers from audit,
scoped like usage: members see their own). Console page with both.

## Scope

**In scope:** read-only. **Out of scope:** editing prompts or tools from the console.

## Validation

- API tests (no secret in the response, scoping); console test; e2e: a chat reply shows as a run

## Resolution

Landed (`feat(agents): …`):

- API module `agents`: `GET /agents` (models as provider/model only, prompt versions, chat tools
  with descriptions, limits, guardrails, approval actions) and `GET /agents/runs` (latest chat and
  cited answers from audit, members see their own). Chat tool descriptions moved to `CHAT_TOOLS`
  so the tools and this page share them.
- Console `/agents` (sidebar: Workspace → Agents): Chat assistant, Cited answers and Shared cards
  (label/value lists that stack in pairs on phones), tool badges (Allowed / Blocked by guardrails),
  recent runs table (when, agent, who, question, what it did, prompt, tokens).

Validation: API 3 (no credential in the overview, runs merged newest first with tools/citations,
member scoping, 401) + OpenAPI paths; console 1; e2e chat spec now checks the run on Agents, layout
10 links with `/agents` at 320 px; screenshots light and 320 px.

Not covered: editing prompts or tools, per-run traces (Langfuse holds those).
