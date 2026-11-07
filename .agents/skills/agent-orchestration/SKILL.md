---
name: agent-orchestration
description: Use when building LangGraph graphs, agent state, checkpoints, routing, tools or recovery.
---

# agent-orchestration

> Status: Planned. `packages/orchestration` is the only owner of LangGraph JS. Today the API has a simple AI SDK tool loop (`/chat`).

## When to use

Multi-step agents, tool use beyond a single chat loop, or anything needing checkpoints and human approval.

## Workflow

1. Graphs live in `orchestration/graphs`; state types in `orchestration/state`.
2. Use LangGraph checkpoints (stored in Postgres) so a run resumes after a crash or an approval pause.
3. Tools are thin wrappers over domain packages; validate tool input with Zod and enforce guardrail policies before side effects.
4. Human approval steps call `human-oversight`; do not implement approvals inside the graph.
5. Bound steps and cost; record every step as an audit event.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`
- A killed run resumes from its last checkpoint
- Agent evals in `evaluation/agents` pass

## References

- `docs/packages/orchestration.md`
- `docs/guides/agent-development.md`
