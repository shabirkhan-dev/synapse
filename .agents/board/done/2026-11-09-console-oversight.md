---
id: syn-040
title: Console oversight: approvals queue and activity (audit) views
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-038]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-12
---

## What

Approvals (syn-028, ADR-0006) and the audit trail (syn-029) have no UI: members cannot see their
requests, admins cannot decide, nobody can browse the history.

## Why / Context

Risky actions (purging documents) wait for an approval nobody can give from the console.

## Proposal or Ask

`features/oversight`: pending approvals (`GET /oversight/approvals`) with approve/reject for
admins and owners (`403` handled for members), the purge-documents request from the Documents page,
and an activity view over `GET /audit/events` (role-scoped by the API).

## Scope

**In scope:**

- approvals list + decide, purge request button, activity list, tests, browser check

**Out of scope:**

- organization management UI (later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- browser check: member requests, admin approves, documents are gone, history shows both

## Resolution

Done in commits `fix(rag): record the person, not the organization, as the purge requester` and `feat(console): add approvals and activity, and ask to delete all documents`.

- **Bug found and fixed (API):** the purge route stored `requestedBy` = the organization id, so in a team a member could not see their own request (members only see requests they made). It is now the user. The team test asserts it and fails without the fix. Also: the purge summary for one document reads "Delete your only document and its chunks".
- Console `features/oversight`: pending approvals (labelled action, "requested by you / a member", time), approve and reject (optional reason), a message saying what the decision did ("Approved. 1 document deleted."), the API's 403 shown as "Only admins and owners decide"; on Documents a "Delete all documents…" confirm dialog that files the request (closes itself: shadcn's Base UI `AlertDialogAction` does not) and links to Approvals. Approving refreshes approvals, documents and activity.
- Console `features/activity`: the last 50 audit events (you / a member / Synapse, plain-word action, one redacted detail as text). `auth` gains `useCurrentUserQuery` (`GET /auth/me`); the header shows the email.
- **Bug found and fixed (console):** at phone width the nav pushed Sign out off-screen; the nav now wraps to its own row. New e2e test fails on the old header.
- `@synapse/ui`: `alert-dialog`, `badge` (shadcn CLI, button kept).
- **Validation:** console 41 tests (list, container approve/403/empty, purge dialog callbacks, activity table incl. text-only detail, activity load/retry, `SubmitButton`); API 113 (+ member sees own request, purge summary); e2e 8 tests incl. request → reload (still there) → approve → documents gone → activity rows; reject keeps documents; phone layout on all workspace pages; stress 21/21 twice (3 repeats, 4 workers).
- **Not done:** organization switcher and member management UI (syn-043), approval history (the API lists pending only), activity filters/paging.
