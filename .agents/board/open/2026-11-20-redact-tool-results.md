---
id: syn-085
title: remove secrets from chat tool results
type: fix
from: human
to: all
priority: normal
status: open
assignee: none
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [apps/api chat, packages/guardrails]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-20
---

## What

Chat tool results (passages, facts) pass through the same secret redaction as replies before the model and the browser see them.

## Why / Context

Known constraint: tool results are not redacted.

## Proposal or Ask

Run guardrails' redaction on tool outputs in the chat module; audit one event per reply. Done with a unit test showing a secret in a passage never reaches the stream.

## Scope

**In scope:** apps/api chat, packages/guardrails.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

_Open._
