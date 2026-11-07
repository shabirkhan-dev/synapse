---
id: syn-016
title: Create @synapse/evaluation with a first retrieval dataset
type: feature
from: human
to: qa
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-013]
branch: main
worktree: none
scope: [packages/evaluation]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Datasets + recall@k/MRR scoring + a regression run in CI.

## Why / Context

Retrieval and prompt changes must be measured, not guessed.

## Proposal or Ask

Small seed dataset, scorer, CI job.

## Scope

**In scope:**

- `packages/evaluation/**`, `.github/workflows/ci.yml`

**Out of scope:**

- generation and agent evals

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass

## Resolution

Done in commit `feat(evaluation): add retrieval evaluation with ci regression baseline`.

- `@synapse/evaluation`: `RETRIEVAL_SEED` (12 docs incl. distractors, 18 cases), recall@k / MRR, `evaluateRetrieval`, `compareToBaseline`, report formatting, committed baseline; 6 tests.
- `@synapse/adapters`: `createHashingEmbeddingGateway` (offline, deterministic).
- `apps/api`: `src/evaluate.ts` + `bun run eval:retrieval` on the real stack; CI `api` job step fails on regression.
- Search made deterministic (content tie-break; vector tie-break in memory so HNSW stays usable — verified with EXPLAIN).
- Baseline `retrieval-seed@1` hashing/hybrid/k3: recall 0.889, MRR 0.824. Findings raised: syn-021 (keyword AND), syn-022 (HNSW tenant filtering).
