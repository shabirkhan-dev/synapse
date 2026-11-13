---
id: syn-055
title: console: agents — the assistant's model, prompt, tools and guardrails, and its recent runs
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: none
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

_Open._
