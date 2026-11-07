---
name: human-oversight
description: Use when adding approvals, review queues, decisions, escalation or feedback capture.
---

# human-oversight

> Status: Planned. `packages/human-oversight` owns all feedback and approval state.

## When to use

A workflow must pause for a human, a reviewer must see a queue, or user feedback must be stored.

## Workflow

1. Model approvals as explicit states (pending → approved/rejected/expired) with an owner and a deadline.
2. Orchestration asks for approval and waits on a checkpoint; it never stores the decision itself.
3. Feedback (thumbs, corrections, labels) is stored here and exported to `evaluation/datasets`.
4. Every decision writes an audit event with who, what and why.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agent/rules/documentation.md`
- No second place stores feedback or approvals

## References

- `docs/packages/human-oversight.md`
