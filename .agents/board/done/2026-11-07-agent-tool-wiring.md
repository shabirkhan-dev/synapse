---
id: syn-006
title: Make rules, memory and skills load in Codex, OpenCode and Claude Code
type: chore
from: human
to: all
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [.agents, CLAUDE.md, opencode.json, .claude/skills]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Rename `.agent` → `.agents`; add `CLAUDE.md` imports, `opencode.json` instructions and the `.claude/skills` symlink.

## Why / Context

Agents should pick up our conventions without being told.

## Proposal or Ask

Wire each tool to the single `.agents/` source.

## Scope

**In scope:**

- agent entry files and `docs/agents/tool-compatibility.md`

**Out of scope:**

- Cursor

## Validation

- Claude Code lists the project skills after the change; links and imports resolve

## Resolution

Done in `e896966`.
