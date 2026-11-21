---
id: syn-085
title: remove secrets from chat tool results
type: fix
from: human
to: all
priority: normal
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [apps/api chat, packages/guardrails]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-21
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

Done. `createChatTools` runs `GuardrailsService.redactSecrets` (the output guard's `check`, `redactSecrets` from
`@synapse/security`) on each searched passage's text and heading path and on a remembered fact, so the
model, the stream and the stored conversation get `[secret]`. The chat service audits one
`guardrails.output.redacted` (`surface: "chat.tool"`) per reply, however many results had one; a failed audit
write is logged (the reply is already streaming). Titles and sources are not checked.

Validation: `apps/api/test/guardrails.test.ts` "a secret in a searched passage never reaches the model, the
stream or the stored reply" (two searches, one audit event); guardrails + chat suites 21 pass; full API suite,
lint, typecheck, architecture check below. Commit: this change (`fix(chat): remove secrets from chat tool
results (syn-085)`).
