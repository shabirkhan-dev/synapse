---
id: syn-086
title: chat: rename, keep stopped answers, earlier versions on regenerate
type: feature
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
scope: [packages/database, packages/memory, apps/api chat, apps/console chat, tests/e2e]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-21
---

## What

Rename a conversation; a stopped answer is saved; regenerating keeps the earlier reply as a version you can switch back to.

## Why / Context

Gap review 2026-11-19 (item 7).

## Proposal or Ask

API: `PATCH /chat/conversations/:id` (title), save partial replies on abort, versions for the last reply. Console: rename in the list, version switcher. Done with API + console tests and an e2e.

## Scope

**In scope:** packages/database, packages/memory, apps/api chat, apps/console chat, tests/e2e.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

Done.

- **Rename:** `PATCH /memory/conversations/{id}` (`{ title }`, 1–80, owner only). The console renames
  from the pencil beside the conversation heading rather than in the list: the list rows already
  carry the delete button, and the heading is where the name is read.
- **Stopped answers:** the reply is saved through `onEnd` with `isAborted`, and the route passes
  `consumeSseStream: consumeStream` so the stream is read to its end after the browser disconnects.
  Text cut off mid-stream is kept (marked done); tool calls without a result are dropped, because they
  could not be replayed on the next turn.
- **Versions:** regenerate archives the last reply (`chat_messages.archived_version`, migration 0023,
  idempotent) instead of deleting it. `GET /memory/conversations/{id}` returns `replyVersions`, and
  `PUT /memory/conversations/{id}/reply-version { version }` puts one back in use (conversation row
  locked). The console shows `‹ 2 / 3 ›` beside Copy and Regenerate; after a failed regenerate the
  switcher stands alone so an earlier reply can be brought back. CORS now allows PATCH.

Validation:
- API: chat suite 16 pass (versions put back and replayed, stopped answer saved, rename owner-only).
- Postgres: `memory.integration.test.ts` 4 pass (archive, switch both ways, another owner refused, new
  question resets, rename).
- Console: `chat.test.tsx` 17 pass.
- e2e: `chat-history.spec.ts` passes, 3/3 on repeat; `answer-flow` and `chat` specs pass.
- lint, typecheck and the architecture check run before the commit.

Commit: this change (`feat(chat): rename conversations, keep stopped answers and reply versions
(syn-086)`).
