---
id: syn-031
title: Add guardrails: input/output policies and prompt-injection defense
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
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

Done in commit `feat(guardrails): add prompt-injection defense, input policy and tool allowlist`.

- `@synapse/guardrails` (new): `sanitizeUntrustedText` / `sanitizePassages` (instruction-like phrases → `[instruction removed]`, facts kept), `createInputPolicy` (length, blocked terms), `createToolPolicy` (allowlist), `createOutputGuard`; 15 tests incl. 8 injection shapes and benign support text.
- `@synapse/security`: `redactSecrets` (keys/tokens only, for model output).
- `@synapse/generation`: prompts v2 (`rag-answer@2`, `rag-answer-cited@2`, `chat-assistant@2`) frame passages, tool results and facts as data.
- API `guardrails` module: input checks on `/rag/query` and chat messages (422 `GUARDRAILS_INPUT_BLOCKED`, audited without the text), passages sanitized once at retrieval and in `searchDocuments`, facts with instructions refused (memory poisoning), secrets removed from RAG answers, chat tools filtered by the allowlist. Config `GUARDRAILS_MAX_INPUT_CHARS`, `GUARDRAILS_BLOCKED_TERMS` (`.env.example`, compose, Doppler `dev`).
- **Validation:** 6 API tests: an injected "ignore all previous instructions" passage → one generation, normal citation, phrase replaced in the prompt, flag audited; chat tool results sanitized; blocked term → 422 before any embedding or model call, audited without the text; blocked chat message stores nothing; instruction-carrying fact refused; leaked key removed from the answer and audit. Postgres suites: 97 API + 5 worker, two parallel runs.
- **Not done:** model-based classifiers, risk scoring, secret checks on streamed chat text.
