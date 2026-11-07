---
id: syn-023
title: Keep every credential and setting in one root env file
type: chore
from: human
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [.env.example, apps/api/package.json, packages/database/package.json, docker/compose, docs]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Credentials were split between `env.docker.example` (compose) and `apps/api/.env.example` (host runs).

## Why / Context

The human asked for one place to manage credentials, so both they and agents can run things easily.

## Proposal or Ask

One root `.env` (template `.env.example`) read by docker compose and every host script.

## Scope

**In scope:**

- env templates, app/package scripts, compose passthrough, docs

**Out of scope:**

- the console (reads no env yet); cloud environment secrets (set in the environment's settings)

## Validation

- `bun run test`, `bun run eval:retrieval` and the API integration tests run from the root `.env` with no inline env

## Resolution

Done in commit `feat(observability): export traces to langfuse and keep credentials in one env file`.

- Root `.env.example` merges both templates (+ Langfuse keys); `env.docker.example` and `apps/api/.env.example` removed.
- `dev`, `test`, `test:coverage`, `eval:retrieval` (api) and `db:migrate` (database) run `bun --env-file=../../.env` (a missing file is ignored, so CI is unchanged).
- Compose passes `LANGFUSE_*` to the API. Docs, rules (`configuration.md` rule 7) and memory updated.
