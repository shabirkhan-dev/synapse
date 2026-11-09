---
id: syn-034
title: Add providers: direct OpenAI, Anthropic, Google and Cohere model adapters
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-033]
branch: main
worktree: none
scope: [packages/providers, packages/adapters, apps/api/src/config]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

Every model call goes through one OpenAI-compatible endpoint (OpenRouter by default).

## Why / Context

Architecture: vendor SDKs live in `providers`; teams want direct provider keys (cost, data terms,
features such as Anthropic prompt caching) and a fallback provider for reliability.

## Proposal or Ask

`@synapse/providers` with AI SDK provider packages (OpenAI, Anthropic, Google, Cohere embeddings),
selected by config (`AI_CHAT_PROVIDER`, `AI_EMBEDDING_PROVIDER`), behind the existing
`ModelGateway`; fallback chat provider wired to the reliability breaker (syn-033).

## Scope

**In scope:**

- providers package, config, gateway selection, docs

**Out of scope:**

- per-organization provider keys (later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- gateway built for each provider with mock fetch; provenance names the real provider and model

## Resolution

_Open._
