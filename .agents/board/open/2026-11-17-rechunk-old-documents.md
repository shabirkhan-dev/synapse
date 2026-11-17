---
id: syn-077
title: worker: re-chunk documents written before text-v2 or without saved context
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

Chunks from text-v1, and text-v2 chunks written before syn-074 (context never saved), miss the heading context in the keyword index, the document page and (text-v1) the embeddings. Only re-adding a document upgrades it.

## Why / Context

Phase 5 follow-up (roadmap rows after syn-075).

## Proposal or Ask

A resumable worker job (like re-embedding) that re-chunks such documents from their stored text with the current chunker and swaps the chunks in one transaction per document; runs on worker start.

## Scope

**In scope:** the above. **Out of scope:** anything else.

## Validation

Integration test with Postgres: old chunks replaced, context saved, idempotent, resumes from its checkpoint.

## Resolution

_Open._
