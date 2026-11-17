---
id: syn-073
title: evaluation: score answers for faithfulness and relevance
type: feature
from: reviewer
to: backend
priority: normal
status: done
assignee: claude
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

Landed in `feat(evaluation): score answers for faithfulness and relevance` (on `main`).

- `@synapse/evaluation`: `judgeAnswer` (one chat call, rubric after Ragas, `answer-judge@1`,
  passages and answer framed as data, strict 0–1 parsing → `EVALUATION_JUDGE_UNREADABLE`) and
  `checkJudge` with six hand-labelled cases (supported, invented, off-topic, contradicting, injection).
- API: `POST /evaluations/runs { judgeAnswers: true }` answers each question through the RAG path
  (four at a time) and judges it; results keep each answer, scores and reason, plus means and the
  judge's model/version (jsonb, no migration); failures leave a question unjudged with the reason;
  run audit data includes the means.
- Console: "Also score answers" (cost described, not in the label), an "Answer quality" summary,
  Faithful/Relevant columns and the judge's reason per question.
- e2e fake model answers the judge prompt.

Not done: the judge has not been checked against `JUDGE_CHECK_CASES` with a real model: no chat model
key is set in dev (local `.env` or Doppler `synapse/dev`). Run `checkJudge` with a key before trusting
the scores. Ragas-style claim decomposition is not implemented (one rubric call).

Validation: evaluation 11 pass; API 195 pass with Postgres (judged run with one unreadable verdict;
retrieval-only run calls no model); console 97 pass; e2e 21 pass; security 14 and chaos 8 pass;
screenshots light and dark.
