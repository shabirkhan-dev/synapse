---
id: syn-032
title: Add organizations and roles (multi-user tenancy)
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-017]
branch: main
worktree: none
scope: [packages/security, packages/database, apps/api]
allowed_shared: []
created: 2026-11-08
updated: 2026-11-09
---

## What

Every user is their own tenant (`sub`); there is no way to share documents or have someone else
approve an action.

## Why / Context

Security architecture: tenancy and permissions are planned in `security`. Human oversight needs
reviewers other than the owner.

## Proposal or Ask

Organizations with members and roles (`owner`, `admin`, `member`); the access token carries the
active organization; RAG, memory and audit rows are scoped to the organization (migration that
moves today's per-user rows into a personal organization); approvals decided by admins.

## Scope

**In scope:**

- tables, token claim, authorization checks, data migration, docs

**Out of scope:**

- SSO, billing

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a member cannot see another organization's data; an admin approves a member's request (integration test)

## Resolution

Done in commits `fix(database): take an advisory lock while running migrations` and `feat(organizations): add teams with owner, admin and member roles`. Decision: ADR-0006.

- Tenancy: organizations are tenants; the personal organization shares the user's id, so no existing row moves (migration `0012` backfills personal organizations; sign-up creates one in the same transaction). Documents, search, answers and approvals use the active organization; memory, feedback and account events stay per user.
- `@synapse/security`: `org` claim on access tokens (absent = personal, so old tokens work), roles `owner ⊇ admin ⊇ member` with `can()`.
- API `organizations` module (list, create, members, add/change role by email, remove; last owner protected; personal orgs single-member); `POST /auth/switch-organization` (session keeps the org through refreshes). The auth middleware reads the role on every request: a removed member gets `401 AUTH_NOT_A_MEMBER` on the next call.
- Oversight: `requested_by` on approvals; members request and see their own; admins/owners see all and decide (`403 OVERSIGHT_FORBIDDEN` otherwise). Audit: admins see the organization's history, members their own; the actor is always the user (bug found by the history test: RAG events had recorded the organization as actor).
- Migration race found while testing (API and worker suites migrating at once): `runMigrations` now takes `pg_advisory_xact_lock`; a test on a fresh database fails 3/3 without the lock and passes 3/3 with it; added to CI.
- **Validation:** 7 API flow tests (sharing inside a team only, member asks/admin decides, role rules incl. last owner and personal org, removal cuts access on the next request and refresh falls back to personal, refresh keeps the org, history scoping); 4 Postgres tests (personal org on sign-up, backfill complete, team membership/roles/owner count, session org); 108 API tests in 3 parallel runs with the worker and orchestration suites; real-server smoke with the built bundle and `dist/migrate.js`.
- **Not done:** email invitations, SSO, billing, organization deletion/rename.
