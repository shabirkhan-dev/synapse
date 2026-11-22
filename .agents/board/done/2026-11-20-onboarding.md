---
id: syn-088
title: first-run onboarding with sample documents
type: feature
from: human
to: all
priority: low
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [apps/console documents, tests/e2e]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-22
---

## What

An empty workspace offers to add three sample documents and points to Chat and the Playground.

## Why / Context

Gap review 2026-11-19 (item 7): a new workspace starts blank.

## Proposal or Ask

Sample documents shipped with the console, added through the normal ingest path; dismissible checklist. Done with a test and an e2e.

## Scope

**In scope:** apps/console documents, tests/e2e.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

Done. Commit: this change (`feat(console): get started card with sample documents (syn-088)`).

- **What shows:** a `Get started` card under the Documents title, in a new `onboarding` feature. The
  page passes it to `DocumentsContainer` as `intro`, so documents and onboarding do not import each
  other. It has three steps, each ticked off from what exists:
  - Add documents: at least one document.
  - Ask in Chat: at least one conversation.
  - Check the sources: the Playground link was followed.
- **Progress:** "1/3" as a count chip; steps are tiles with a tick and a `Done` badge.
- **Sample documents:** "Add sample documents" posts three short Markdown policies of a made-up shop
  (`Sample · Returns and refunds`, `· Shipping and delivery`, `· Product warranty`) through
  `POST /rag/documents`, one at a time. That is the normal path: dedup, chunks with heading paths,
  embedding, audit. Adding them again returns the stored ones.
- **Hiding:** "Hide" (named "Hide Get started") puts the card away. That and the Playground visit are
  remembered per workspace in this browser (`localStorage`, `synapse.onboarding.v1.<organizationId>`,
  read and written inside try/catch). The card also goes once all three steps are done.

Validation:
- `onboarding.test.tsx`: samples posted in order and the step done; the Playground remembered; Hide
  persisted.
- e2e `onboarding.spec.ts`: a new account adds the samples, asks the sample question in Chat, sees
  two steps done, hides the card, and it stays hidden after a reload.
- Screenshots in light and dark.
