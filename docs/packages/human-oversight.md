# `@synapse/human-oversight`

Keep humans in the loop: approvals, review queues, decisions, escalation and feedback.

> **Status:** Live (approvals, review queue, decisions, answer feedback) · Planned (escalation,
> reviewers other than the owner once roles exist).

## Internal modules

`approvals/ review-queues/ decisions/ escalation/ feedback/`

## Owns

- Approval requests and their states
- Review queues
- Recorded decisions
- Escalation rules
- All user feedback

## Does not own

- Workflow execution (→ `orchestration`)

## Depends on

`core`

## Public API

| Export | What it does |
| --- | --- |
| `createApprovals(store)` → `{ request, get, pending, decide }`, `ApprovalStore`, `ApprovalRequest`, `Decision` | Requests are `pending` until one decision (`approved` / `rejected`) is written; repeating the same decision returns the stored request, a different one throws `OVERSIGHT_APPROVAL_ALREADY_DECIDED`; unknown or another owner's → `OVERSIGHT_APPROVAL_NOT_FOUND` |
| `createFeedback(store)` → `{ record }`, `FeedbackStore`, `AnswerFeedback` | Thumbs `up` / `down` (+ optional comment) per owner and answered request id; rating again replaces it |
| `OVERSIGHT_ERROR_CODES` | Error codes thrown by the package |

Storage is the caller's (the API's `oversight` module: tables `approval_requests`,
`answer_feedback`). The pause itself is `@synapse/orchestration`'s `createApprovalGatedGraph`: the
approval id is the paused run's thread id.

## How the API uses it

| Endpoint | What happens |
| --- | --- |
| `POST /rag/documents/purge` | Stores an approval request (`rag.purge-documents`) and pauses a checkpointed run. `202`; nothing is deleted |
| `GET /oversight/approvals` | Your pending requests |
| `POST /oversight/approvals/{id}/approve` | Writes the decision, resumes the run (any API instance; Postgres checkpoints), runs the action, returns its result |
| `POST /oversight/approvals/{id}/reject` | Writes the decision; the run ends without running the action |
| `POST /oversight/feedback` | `{ requestId, rating, comment? }` for an answered `/rag/query` |

Requests belong to the active organization and record `requestedBy`. Admins and owners see all of
the organization's pending requests and decide them; members see only their own and get `403` when
deciding (ADR-0006). In a personal organization the user is the owner, so they confirm their own. Feedback joins answers by `x-request-id`: `answer_feedback.request_id` = the
`rag.query.answered` event's `request_id` in `audit_events`, which carries the provenance.
