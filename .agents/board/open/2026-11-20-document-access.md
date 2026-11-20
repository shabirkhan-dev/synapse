---
id: syn-081
title: document permissions inside an organization
type: feature
from: human
to: all
priority: high
status: open
assignee: none
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [packages/database, packages/retrieval, apps/api modules rag/chat/evaluations, apps/console documents, docs]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-20
---

## What

Documents can be restricted to chosen members of an organization; owners and admins still see everything. Search and answers only use documents the asker may read, filtered before ranking.

## Why / Context

Gap review 2026-11-19 (item 5): today every member sees every document of the organization.

## Proposal or Ask

ADR-0008. A document is `organization` (default) or `restricted` with a member list; the uploader, admins and owners always read it. Listing, detail, search (vector, keyword, scoped), chat tools, evaluations and the console respect it. Done with integration tests proving a member cannot find a restricted document through any path.

## Scope

**In scope:** packages/database, packages/retrieval, apps/api modules rag/chat/evaluations, apps/console documents, docs.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

_Open._
