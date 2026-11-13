---
id: syn-051
title: tests/: load, chaos and security suites for the api
type: feature
from: pm
to: qa
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-041]
branch: none
worktree: none
scope: [tests, docs/development/testing.md]
allowed_shared: [package.json]
created: 2026-11-13
updated: 2026-11-13
---

## What

Root `tests/` has browser e2e only. Add a load suite, a chaos suite and a security suite.

## Why / Context

Roadmap Phase 3. The production stack now exists (syn-041), but nothing measures throughput, how
the API behaves when Postgres or the model provider fails, or checks auth/tenancy from outside.

## Proposal or Ask

- `tests/load`: a scripted load run (sign-in, ingest, query, chat stream) against the fake model
  server with p50/p95 and error-rate thresholds.
- `tests/chaos`: stop Postgres / make the model server slow or 5xx mid-run; expect readiness 503,
  `504 RELIABILITY_TIMEOUT`, `503 RELIABILITY_CIRCUIT_OPEN`, recovery afterwards.
- `tests/security`: cross-tenant reads, token tampering, refresh reuse, rate limits, body limits,
  security headers.

## Scope

**In scope:** the three suites, root scripts, docs. **Out of scope:** CI load runs on every push.

## Validation

- each suite runs locally with one command and fails when its threshold or expectation is broken

## Resolution

_Open._
