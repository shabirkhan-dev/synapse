---
id: syn-063
title: guardrails: remove secrets from streamed chat replies
type: bug
from: reviewer
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/guardrails, apps/api/src/modules/chat, apps/api/src/modules/guardrails, apps/api/test, docs]
allowed_shared: []
created: 2026-11-15
updated: 2026-11-15
---

## What

RAG answers had leaked keys and tokens replaced before they were returned; streamed chat replies
went to the client (and into the stored conversation) unchecked.

## Why / Context

Gap review (2026-11-14), "later" item 2 of 3.

## Proposal or Ask

Redact per delta, without waiting for the whole reply: hold back the trailing word (secrets contain
no whitespace; `Bearer <token>` holds `Bearer` too) and check text as it completes.

## Scope

**In scope:** streamed text and reasoning, the stored reply, one audit event per reply.
**Out of scope:** tool results streamed to the client (the user's own documents).

## Validation

- package: a key and a bearer token split at every position (two deltas, and one character at a
  time) are replaced; clean text passes word by word; a 3000-character word is not held forever
- api: a model streaming a key across deltas → streamed body, stored conversation and audit never
  contain it; `guardrails.output.redacted` with `surface: "chat.message"`. The test fails with the
  transform removed

## Resolution

Landed in the `fix(guardrails)` commit on `main`. `createOutputGuard(...).streamRedactor()` in
`@synapse/guardrails`; `redactSecretsInStream` (chat module) is the `streamText`
`experimental_transform`; `GuardrailsService.streamRedactor()` / `recordRedaction()`. Docs:
`docs/packages/guardrails.md`; memory updated.
