---
id: syn-031
title: Add guardrails: input/output policies and prompt-injection defense
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-029]
branch: main
worktree: none
scope: [packages/guardrails, apps/api/src/modules/rag, apps/api/src/modules/chat]
allowed_shared: []
created: 2026-11-08
updated: 2026-11-08
---

## What

Retrieved passages and user input go to the model unchecked; tool calls run without a policy.

## Why / Context

Security rule: retrieved documents and tool output are untrusted input (prompt injection), and
model output must not trigger privileged actions without a policy check.

## Proposal or Ask

`@synapse/guardrails`: input checks (size, blocked patterns), passage sanitizing (strip
instruction-like text, mark passages as data), output checks (leaked secrets/PII via
`security` redaction, missing citations), and a tool policy that allows only listed read-only
tools; blocked requests are audited.

## Scope

**In scope:**

- `packages/guardrails`, RAG and chat wiring, audit events for blocks

**Out of scope:**

- model-based classifiers (later, through `providers`)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- an injected "ignore previous instructions" passage does not change the answer path (test); blocked inputs are audited

## Resolution

_Open._
