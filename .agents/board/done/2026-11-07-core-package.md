---
id: syn-002
title: Create @synapse/core (errors, config, types)
type: feature
from: human
to: backend
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/core]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

First platform package: `SynapseError`, `loadConfig`, `AnswerProvenance`; contracts/events/utils as folders.

## Why / Context

Build order starts with `core`; every package depends on it.

## Proposal or Ask

Create the package with tests and docs.

## Scope

**In scope:**

- `packages/core/**`, `docs/packages/core.md`

**Out of scope:**

- contracts, events, utils (added on first real use)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

Done in `5784cd0`.
