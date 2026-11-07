---
id: syn-027
title: Keep secrets in Doppler and sync the root .env from it
type: chore
from: human
to: backend
priority: high
status: done
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

Done in commits `chore(env): sync the root .env with doppler` and `fix(env): keep the .env backup private and finish the doppler setup`.

- Human created project `synapse` (dev/stg/prd) and a `dev` read/write service token with the CLI; the token is stored as a network secret for `api.doppler.com` on the Default cloud environment (proxy-injected; the CLI runs with a placeholder `DOPPLER_TOKEN`).
- Uploaded `dev`: every `.env.example` variable with its default, plus the real Langfuse and Resend keys and `EMAIL_FROM` (38 keys; no session-local database URLs). Empty for now: `AI_API_KEY`, `AI_EMBEDDING_*`, `AI_MODEL_PRICES`.
- Verified: pulled values build a valid api and worker config (Langfuse tracing on, Resend on); `env-sync.sh pull` and `push` round-trip in a scratch copy (test key added, read back, deleted). `.env.backup` is now `chmod 600` like `.env`.
- Left in Doppler untouched: the example entries Doppler created (`DB_URL`, `FEATURE_FLAGS`, `LOGGING`, `PRIVATE_KEY`, `STRIPE_KEY`); the app ignores them.
- Not done: `stg`/`prd` values, CI and deploys reading Doppler.
