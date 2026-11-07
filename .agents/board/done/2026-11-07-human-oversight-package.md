---
id: syn-028
title: Add human-oversight: approvals, review queue and feedback
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-025]
branch: main
worktree: none
scope: [packages/human-oversight, apps/api/src/modules, packages/database]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

Graphs cannot pause for a person, and answers cannot be rated.

## Why / Context

Architecture: approvals and feedback have one owner (`human-oversight`); LangGraph can pause with `interrupt` and resume from a checkpoint.

## Proposal or Ask

Approval requests stored in Postgres with a review queue (list, approve, reject); a graph step that pauses for approval and resumes on the decision; thumbs up/down feedback on answers (stored with provenance).

## Scope

**In scope:**

- `packages/human-oversight`, tables, API endpoints, one graph using an approval step

**Out of scope:**

- console screens (syn-018 and later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- a paused graph resumes after an approval, in a new process (Postgres checkpoints)

## Resolution

Done in commit `feat(oversight): add approval-gated actions, review queue and answer feedback`.

- `@synapse/human-oversight` (new): `createApprovals` (pending → one decision; same decision repeat-safe, opposite → `OVERSIGHT_APPROVAL_ALREADY_DECIDED`; other owners → not found) and `createFeedback` (up/down + comment per owner and request); 4 tests.
- `@synapse/orchestration`: `createApprovalGatedGraph` (request → `interrupt` → execute or end; approval id = thread id, so the request step is idempotent; `decide` after completion returns the outcome without re-running); 3 tests + Postgres test across processes.
- `@synapse/database`: `approval_requests`, `answer_feedback` (migration `0007`).
- API `oversight` module: `GET /oversight/approvals`, `POST /oversight/approvals/{id}/approve|reject`, `POST /oversight/feedback`; RAG registers `rag.purge-documents` and adds `POST /rag/documents/purge` (202, nothing deleted until approved). The API sets up a Postgres checkpointer (`langgraph` schema) on start.
- **Validation:** 6 API flow tests (purge only after approval, reject keeps data and blocks flipping, other users get 404, double approve runs once, auth/validation, feedback upsert); Postgres integration: a request made in one process is approved in a new process and runs once; real-server smoke: purge 202 → 2 docs remain → approve 200 `{deleted: 2}` → 0 docs.
- **Not done:** reviewers other than the owner (needs roles), approval expiry, escalation, console screens.
