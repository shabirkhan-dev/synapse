---
id: syn-004
title: Extract @synapse/database and restructure apps/api to the standard
type: feature
from: human
to: backend
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/database, apps/api]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Database client, schema, migrations and runner as a package; API moved to config/, shared/, infrastructure/, routes/ and per-layer module folders.

## Why / Context

Any app or package should be able to use the database; the API must follow the agreed backend standard.

## Proposal or Ask

Move without changing behaviour; enforce status and error-code constants.

## Scope

**In scope:**

- `packages/database/**`, `apps/api/**`, docs

**Out of scope:**

- new endpoints

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- pgvector integration test, built `migrate.js` and server boot against real Postgres

## Resolution

Done in `6d6d5e6`.
