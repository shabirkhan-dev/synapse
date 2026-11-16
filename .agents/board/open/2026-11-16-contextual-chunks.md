---
id: syn-068
title: knowledge: chunks carry their document title and heading path
type: feature
from: reviewer
to: backend
priority: high
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: []
allowed_shared: []
created: 2026-11-16
updated: 2026-11-16
---

## What

A chunk under a heading like Exceptions does not say which document or section it is from, so search misses it (Anthropic: context prepended to chunks cuts retrieval failures 35-49%).

## Why / Context

Phase 5 review (`.agents/plans/phase-5-rag-quality.md`), asked by the human: "keep improving the UI/UX
and make it the ultimate RAG system".

## Proposal or Ask

Chunker v2 tracks Markdown heading paths; embed and keyword-index 'title > heading path' plus the text; compare with the retrieval baseline; re-embedding via the worker.

## Scope

See the plan; one card per commit.

## Validation

Unit and e2e tests for the changed flow; screenshots for UI.

## Resolution

_Open._
