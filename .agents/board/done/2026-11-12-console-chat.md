---
id: syn-044
title: Console chat: streaming answers with stored conversations
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-043]
branch: main
worktree: none
scope: [apps/console, packages/ui, tests/e2e]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

A chat page on the API's streaming `/chat` (tool calls such as `searchDocuments`, stored
conversations with `{ message, conversationId }`, long-term facts) — the playground is one-shot.

## Why / Context

Chat with memory is built in the API (syn-030) but nobody can use it from the console.

## Proposal or Ask

`features/chat`: stream the reply as it arrives (the API client gains a streaming call), list and
resume conversations, show tool calls (searched documents) and errors mid-stream; e2e with the
fake model server.

## Scope

**In scope:**

- chat page, conversation list, streaming in `lib/api`, tests, e2e

**Out of scope:**

- editing or deleting conversations, voice, attachments

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

Done in commits `fix(ui): meet wcag focus, contrast and ios zoom rules from the interface review` and `feat(console): add streaming chat with stored conversations`.

- **Chat** (`/chat`, nav "Chat"): conversation list (real links `/chat?c=<id>`, current marked, delete with a confirmation naming the conversation), thread with your messages and Synapse's, tool rows in words ("Searched your documents for “…” · 1 passage", "Show sources" disclosure, failures say "failed"), "Thinking…" until the first part, composer (Enter sends, Shift+Enter new line, IME-safe, Stop while streaming, empty message explained, a refused message comes back into the box with the API's reason), empty state with three starter questions, a polite status region ("Synapse is answering…"). A chat started on the page keeps streaming when the API hands back `x-conversation-id`; reload restores it. Phones get a "Show conversations" toggle that closes when one is opened.
- **Streaming client:** `apiStream` in `lib/api` (bearer, 401 refresh, error envelope) + `ai`'s `parseJsonEventStream` / `readUIMessageStream` in the chat service; no `@ai-sdk/react` (apps may not import `@ai-sdk/*`).
- **UI/UX skills:** `bunx skills add jakubkrehel/skills` (15 skills, reviewed, committed separately). A `better-interface` pass over every console screen, rendered at 1100px and 320/390px and measured in the browser, found and fixed: focus indicators below 3:1 (1.54:1 link outline, 2.59:1 control border → `--ring` 0.556, solid outline, 4.73:1); 12px secondary text on `--muted` at 4.34:1 (`--muted-foreground` 0.52 → 5.05:1); main nav links hidden past a sideways scroll at 320px (now wraps); `/chat` 4px sideways scroll at 320px (suggestions wrap); 14px inputs zooming iOS (16px below `md`); no current-page marker in the nav (`aria-current`); phone conversation list left open; Stop→Send colour flash (`transition-all` on a reused button).
- **Validation:** console 58 tests (message list incl. failed tool and Thinking, composer keys/validation/Stop, conversation list confirm, thread streaming from a mocked SSE body incl. `x-conversation-id`, stored id sent, refused message restored); e2e 10 tests incl. `chat.spec.ts` against the real API with a streaming fake model, and `layout.spec.ts` now at 320px (fails on the old header); API and other suites unchanged.
- **Not done:** Markdown in answers, renaming conversations, regenerate/edit, the `ai` tool parts for `rememberFact` beyond its text, dark-mode contrast re-measure (tokens unchanged there; ring 4.18:1).
