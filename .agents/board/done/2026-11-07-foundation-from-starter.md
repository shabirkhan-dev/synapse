---
id: syn-001
title: Import the starter and clean it down to the Synapse base
type: chore
from: human
to: all
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [repo]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Import Rabtx/starter, remove what Synapse does not need, rename to Synapse, rename apps to `api` and `console`, and rebuild `packages/ui`.

## Why / Context

Synapse needs a clean Bun + Turborepo base without the starter's mobile, Nest, docs and Rust apps.

## Proposal or Ask

Batches 1–6: remove apps, rename, restructure apps, keep oxlint/oxfmt, refresh lockfile, new shadcn-based `@synapse/ui`.

## Scope

**In scope:**

- whole repository

**Out of scope:**

- new platform features

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

Done in `d3dd63b`, `932307d`, `f6d18d7`, `42d6a07`, `b0e04b9` (render/changelog/vercel removed, docs + agent skeleton added).
