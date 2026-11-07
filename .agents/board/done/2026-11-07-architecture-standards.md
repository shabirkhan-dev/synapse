---
id: syn-003
title: Codify backend/frontend standards and enforce them
type: feature
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
scope: [.agents/rules, .agents/skills, docs/development, scripts/architecture]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Backend modules (route → service → repository), frontend features (container → hook → service → API client), central config — written as rules, skills and docs, and enforced by `check-layers.sh`.

## Why / Context

Standards only hold if checks fail when they are broken.

## Proposal or Ask

Rules + skills + docs + automated checks with a fixture test.

## Scope

**In scope:**

- `.agents/rules/*`, `.agents/skills/*`, `docs/development/*`, `scripts/architecture/*`

**Out of scope:**

- console features

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- `bun run test:scripts` (fixture proves every check fires)

## Resolution

Done in `bc7f038`.
