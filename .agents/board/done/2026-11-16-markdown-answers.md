---
id: syn-066
title: ui: render answers as safe Markdown in chat and the Playground
type: feature
from: reviewer
to: web
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [apps/console/src/components/shared, apps/console/src/features/playground, apps/console/src/features/chat, apps/console/test, docs]
allowed_shared: []
created: 2026-11-16
updated: 2026-11-16
---

## What

The model writes Markdown (bold, lists, code) but answers render as plain text, so readers see raw asterisks and hashes.

## Why / Context

Phase 5 review (`.agents/plans/phase-5-rag-quality.md`), asked by the human: "keep improving the UI/UX
and make it the ultimate RAG system".

## Proposal or Ask

Render Markdown with react-markdown + remark-gfm, never raw HTML; links only for http(s); keep [n] citation links working in the Playground.

## Scope

See the plan; one card per commit.

## Validation

- unit: emphasis, lists, code and tables render as elements (no `**` left); only http(s) links are
  followed (new tab, noopener noreferrer), javascript:/mailto: stay text; known `[n]` become source
  links, unknown stay text; `<script>` and `<img onerror>` are shown as text, never created
- e2e: all 19 pass (the Playground citation flow unchanged)

## Resolution

Landed in the `feat(console)` commit on `main`. `components/shared/markdown.tsx` (react-markdown 10.1.0 +
remark-gfm 4.0.1, both MIT, pinned in `apps/console/package.json`) with an `htmlAsText` remark step;
the Playground's `AnswerText` and chat text parts use it. Docs: `frontend-architecture.md`.
