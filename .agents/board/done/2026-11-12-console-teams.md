---
id: syn-043
title: Console teams: organization switcher, members and roles
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-040]
branch: main
worktree: none
scope: [apps/console, apps/api/src/modules/auth, tests/e2e]
allowed_shared: []
created: 2026-11-12
updated: 2026-11-12
---

## What

Organizations, members and roles exist in the API (syn-032, ADR-0006) but the console always works
in the personal organization: no way to create a team, add people or switch.

## Why / Context

Approvals only make sense with other people (members ask, admins decide); activity scoping by role
cannot be seen in the console today.

## Proposal or Ask

`features/organizations`: list memberships with role, create a team, switch the active
organization (`POST /auth/switch-organization`, new access token; refetch every query), members
list with add-by-email, change role, remove (last owner protected), role-aware UI (hide decide
buttons for members), e2e of a member asking and an admin deciding.

## Scope

**In scope:**

- switcher in the header, members page, role-aware approvals, tests, e2e

**Out of scope:**

- invitation emails, SSO

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check`, `bun run test:e2e` pass

## Resolution

Done in commit `feat(console): switch organization, create teams and manage members`.

- **API:** `GET /auth/me` also returns `organization: { id, role }` (the organization the token acts in, role read on that request), so the console knows where it is without decoding the token. Tests: personal → owner, team → member.
- **Console `features/organizations`:** header switcher (Base UI select, all memberships), `/team` page (personal: explanation; team: members with role pickers and Remove for rows the caller could give that role, never their own; add by email with role; "New team" creates and switches into it). Switching stores the new access token and resets every query. Approvals hide approve/reject for members ("Waiting for an admin or owner to decide."). `lib/permissions.ts` mirrors the API's role rules; `@synapse/ui` gains `select` (shadcn CLI).
- **Bug found and fixed (console):** after adding someone as Admin, the role picker kept "Admin" for the next person (`form.reset()` does not reset Base UI's select state), so a second add silently granted admin. The picker now remounts at "Member". The e2e step fails without the fix ("Received: Admin").
- **Validation:** console 48 tests (members table rules for admin/owner, team page personal → create → switched token used, add with the API's 404 message kept, member read-only, switcher label, member approvals); API 114 (+ `/me` organization); e2e 9 tests incl. two-browser `teams.spec.ts`, phone layout incl. `/team`; stress 27/27 (3 repeats, 4 workers). Locally on Postgres 16 + pgvector 0.8.1 built from source (0.6 lacks `hnsw.iterative_scan`).
- **Not done:** leaving a team, renaming or deleting teams, invitation emails, live cross-tab organization sync.
