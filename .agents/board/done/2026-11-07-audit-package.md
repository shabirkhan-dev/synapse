---
id: syn-029
title: Add audit: event history and stored answer provenance
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-025]
branch: main
worktree: none
scope: [packages/audit, packages/database, apps/api]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-08
---

## What

Provenance is returned with answers but never stored; there is no event history.

## Why / Context

Rule 6: every answer is traceable. Known constraint: provenance is returned, not stored.

## Proposal or Ask

An append-only `audit_events` table (actor, action, subject, data, provenance) behind an `AuditLog` contract; record answers, ingests, deletes and auth events; PII redaction before write.

## Scope

**In scope:**

- `packages/audit`, table, API wiring

**Out of scope:**

- retention policies beyond a prune job

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- every answered query writes one event with its provenance (integration test)

## Resolution

Done in commit `feat(audit): record every answer with provenance in an append-only event history`.

- `@synapse/audit` (new): `createAuditLog({ store, redact })` (redact then append; list newest first, by owner/action), `AUDIT_ACTIONS`; 2 tests.
- `@synapse/security`: `redactPii` / `redactPiiDeep` (emails, phones, cards, JWTs, bearer tokens, provider keys); 4 tests.
- `@synapse/database`: `audit_events` (migration `0008`) + trigger rejecting UPDATE (`0009`, custom migration).
- API `audit` module (`GET /audit/events`); RAG, auth and oversight services record events with the request id (`RequestContext` in `shared/types`). Recorded: answers (question, answer, cited/context chunk ids, provenance), ingests (not duplicates), deletes, purges, sign-up/in/out, email verified, password reset, approval requested and first decision (a repeated decision is not logged). The eval script uses a discarding audit log.
- **Validation:** 6 API tests (answer event with request id, redacted question and provenance; no event for search-only or no-document queries; ingest/delete; auth events never contain the password; approval events without duplicates; owner-scoped history with action filter); Postgres integration: two answers → two events with provenance and a redacted phone number; `UPDATE` rejected by the trigger, row unchanged. Real-server smoke (built bundle): sign-up + sign-in → `GET /audit/events` lists both with request ids.
- **Not done:** retention/pruning of audit rows; redaction is pattern-based only.
