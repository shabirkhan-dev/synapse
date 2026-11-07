---
id: syn-010
title: Create @synapse/adapters with the model gateway
type: feature
from: human
to: backend
priority: high
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/adapters, packages/core/src/contracts, apps/api/src/infrastructure/ai]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Add the first `core` contracts (chat + embedding model gateway) and implement them in `packages/adapters/model-gateway`; move `apps/api/src/infrastructure/ai` onto it.

## Why / Context

Build order: core → adapters. ADR-0003: no domain code talks to a vendor SDK directly.

## Proposal or Ask

Contract in `core/contracts`, implementation in `adapters/model-gateway` (AI SDK, OpenAI-compatible), API uses it. Done when the API runs on the gateway and tests pass.

## Scope

**In scope:**

- `packages/adapters/**`, `packages/core/src/contracts/**`, `apps/api/src/infrastructure/ai/**`, `apps/api/src/server.ts`

**Out of scope:**

- `packages/providers` (vendor split comes with a second vendor)
- vector store, cache, queue, storage adapters

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

_Open._
