---
id: syn-059
title: chat: streaming replies get the chat circuit breaker, a start timeout and an idle deadline
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
scope: [packages/reliability, apps/api/src, apps/api/test, tests/system, docs, .env.example]
allowed_shared: []
created: 2026-11-14
updated: 2026-11-14
---

## What

Streaming chat used the raw model: no timeout, no circuit breaker, the AI SDK's own retries. A hung
provider kept the reply open until Bun's 120 s idle limit; a failing one was never failed fast.

## Why / Context

Gap review (2026-11-14), item 3 of 5 (known constraint from syn-033).

## Proposal or Ask

`withModelReliability` takes a vendor-neutral `wrapChatModel(model, chatPolicy)`; the API wraps the
AI SDK model with middleware: starting the stream runs through the chat policy (per-attempt timeout,
retries, the same `chat` breaker as answers), then an idle deadline between stream parts
(`AI_CHAT_STREAM_IDLE_TIMEOUT_MS`, 30 s) cancels the request and ends the reply with an error.
`streamText` makes no retries of its own.

## Scope

**In scope:** timeout, breaker, idle deadline. **Out of scope:** fallback model for streams
(provenance would name the wrong model).

## Validation

- unit: open circuit refuses a stream at once; a stalled stream ends at the idle deadline; a
  normal stream is unchanged; chaos: a slow model ends the chat with an error within the deadline

## Resolution

Landed (`fix(chat): …`): `withModelReliability` option `wrapChatModel`;
`withStreamReliability` in `@synapse/adapters/model-gateway` (apps may not import `@ai-sdk/*`;
it takes the policy structurally and the idle error from the API) (`wrapLanguageModel` middleware: chat policy around
`doStream`, idle deadline `AI_CHAT_STREAM_IDLE_TIMEOUT_MS` = 30 s that aborts the request and errors
the stream); `streamText` `maxRetries: 0`. The Agents page shows the fallback model under Cited
answers only, since streams have none.

Validation: unit (normal stream unchanged; stalled stream ends at the idle deadline and cancels the
request; a stream that never starts times out, opens the shared breaker, then is refused without a
call); reliability package (hook gets the `chat` policy that answers open); chaos (a chat model 5 s
slow against a 1 s deadline ends the reply with an error in under 4.5 s; before, it waited and
succeeded).
