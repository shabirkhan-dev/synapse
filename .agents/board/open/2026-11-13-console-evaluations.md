---
id: syn-054
title: console: evaluations — your own question sets, scored per search mode
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [apps/api/src/modules, apps/console/src/features, packages/evaluation, tests/e2e, docs]
allowed_shared: [packages/database]
created: 2026-11-13
updated: 2026-11-13
---

## What

Let a team write questions with the documents that should answer them, and see how well each
search mode finds those documents (recall@k, MRR), over time.

## Why / Context

Roadmap Phase 3 "Console: evaluations". `@synapse/evaluation` already computes retrieval metrics
against a committed dataset in CI (hashing embeddings); nothing measures a team's own documents
with the real embedding model.

## Proposal or Ask

- Store eval sets per organization (question + expected document ids) and runs (per mode: recall@k,
  MRR, per-question ranks, embedding model and chunker version).
- API: create/list sets, add questions, start a run, read results. Runs reuse `@synapse/evaluation`.
- Console: Evaluations page — a set's questions, "Run", results per mode with a trend across runs.

## Scope

**In scope:** retrieval metrics only. **Out of scope:** judging answer quality with a model.

## Validation

- unit tests for metrics reuse and tenancy; e2e: add a question, run, see the score

## Resolution

_Open._
