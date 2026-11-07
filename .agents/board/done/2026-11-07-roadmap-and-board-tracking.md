---
id: syn-007
title: Track work on the board and report roadmap status every reply
type: chore
from: human
to: pm
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [.agents/plans, .agents/board, .agents/rules]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Add `.agents/plans/roadmap.md`, backfill done cards, raise the next cards, and a rule that every reply ends with Where we are / Next / Left.

## Why / Context

The human wants progress visible and tracked from now on.

## Proposal or Ask

Roadmap + cards + `progress-tracking` rule wired into CLAUDE.md and AGENTS.md.

## Scope

**In scope:**

- `.agents/plans/**`, `.agents/board/**`, `.agents/rules/progress-tracking.md`, entry files

**Out of scope:**

- code changes

## Validation

- links resolve; `bun run lint` and `bun run architecture:check` pass

## Resolution

Done in the commit that adds this card (`chore(agents): add roadmap, board cards and progress tracking rule`).
