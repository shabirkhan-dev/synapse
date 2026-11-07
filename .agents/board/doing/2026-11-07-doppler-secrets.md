---
id: syn-027
title: Keep secrets in Doppler and sync the root .env from it
type: chore
from: human
to: backend
priority: high
status: doing
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-023]
branch: main
worktree: none
scope: [doppler.yaml, scripts/bash/env-sync.sh, package.json, docs/development]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Every new machine (and agent session) re-creates `.env` by hand.

## Why / Context

The human wants one place for secrets so a new machine needs no manual env setup. Decision: Doppler.

## Proposal or Ask

Doppler project `synapse` (dev/stg/prd) as the source of truth; `doppler.yaml` links the repo;
`bun run env:pull` / `env:push` sync the root `.env`. Agent sessions use a dev service token stored
as a network secret.

## Scope

**In scope:**

- repo wiring, docs, first upload of dev values

**Out of scope:**

- CI and production reading Doppler (later, with the deploy card)

## Validation

- `bun run env:pull` on a fresh checkout produces a working `.env` (api boots, tests pass)
- shellcheck passes

## Resolution

_In progress: repo wiring done; waiting for the human's Doppler project and dev service token._
