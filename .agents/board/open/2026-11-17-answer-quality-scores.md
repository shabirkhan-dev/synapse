---
id: syn-073
title: evaluation: score answers for faithfulness and relevance
type: feature
from: reviewer
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: []
allowed_shared: []
created: 2026-11-17
updated: 2026-11-17
---

## What

Evaluations score retrieval only (recall@k, MRR). Nothing measures whether an answer sticks to its
passages (faithfulness) or answers the question (relevance), as Ragas does.

## Why / Context

Phase 5 review (`.agents/plans/phase-5-rag-quality.md`), step 5.

## Proposal or Ask

An LLM judge in `@synapse/evaluation` (through the model gateway, versioned judge prompt) scoring
faithfulness and answer relevance per question in a workspace evaluation run; shown next to the
retrieval scores. Validate the judge on a few hand-labelled answers before trusting it.

## Scope

**In scope:** judge, scores in runs, console columns. **Out of scope:** CI gate on answer quality
(the seed eval uses hashing embeddings and no real model).

## Validation

Unit tests with a mocked judge (parse, bounds, failure); integration run stores the scores; e2e shows
them.

## Resolution

_Open._
