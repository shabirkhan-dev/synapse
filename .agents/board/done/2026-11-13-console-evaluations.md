---
id: syn-054
title: console: evaluations — your own question sets, scored per search mode
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
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

Landed (`feat(evaluations): …`):

- Migration `0015_evaluations` (`eval_questions`, `eval_runs`, idempotent); `EVALUATION_RUN_COMPLETED`
  audit action.
- API module `evaluations` (routes → service → repository): questions CRUD (documents must belong
  to the active organization; ≤ 50), runs through hybrid/vector/keyword with `evaluateRetrieval`,
  stored with ranks per question, embedding model and chunker; `RagService.hasDocument`.
- Console `/evaluations` (sidebar: Workspace → Evaluations): add a question by ticking the
  documents that answer it (`Checkbox` added to `@synapse/ui` with the shadcn CLI), questions table
  with delete, Top 1/3/5/10, "Run evaluation", scores per mode ("Found in top k", MRR), rank per
  question (muted beyond k), all runs with their scores and embedding model.

Validation: API 8 (unknown and cross-tenant documents, run scores and audit, tenancy, k and size
bounds) + 2 Postgres integration (uuid[] and jsonb round trip, scoping, order); console 2; e2e
`evaluations.spec.ts` + layout (9 links, `/evaluations` at 320 px); screenshots light and 320 px.

Not covered: answer-quality evals, several question sets, runs as background jobs.
