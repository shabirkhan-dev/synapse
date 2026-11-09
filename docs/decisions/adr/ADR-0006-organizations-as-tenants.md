# ADR-0006: Organizations are the tenants; the personal organization shares the user's id

- Status: Accepted
- Date: 2026-11-09

## Context

Until now every row was scoped to its user (`owner_id` = JWT `sub`). Teams need to share documents,
and approvals need reviewers other than the person who asked (syn-032).

## Decision

- **Tenant = organization.** Shared data (documents and chunks, approval requests, their audit
  events) uses `owner_id` = organization id. Per-user data (conversations, memory facts, feedback,
  account events) stays keyed by the user id.
- **Personal organization id = user id.** Sign-up creates it; migration `0012` backfills it for
  existing users. Everything written before organizations already belongs to it: no row moves.
- **Roles** `owner` ⊇ `admin` ⊇ `member` (`@synapse/security` `can`). Members read/write documents
  and request actions; admins decide approvals, manage members and read the organization's audit
  history; only owners grant or remove `admin`/`owner`, and the last owner stays.
- **Active organization** is the access token's `org` claim (absent = personal), stored on the
  session so refreshes keep it; switching issues a new access token. The role is read from the
  database on **every request**, so removal takes effect on the member's next call.

## Consequences

- No data migration of existing rows; old tokens keep working (personal organization).
- One extra indexed lookup per authenticated request (skipped for the personal organization).
- Invitations are by existing account email only; no email invite flow, SSO or billing yet.

## Alternatives considered

- Separate `organization_id` column on every table: clearer names, but a migration of every row
  and every query for the same result.
- Role in the token only: no lookup, but a removed member keeps access until the token expires.
