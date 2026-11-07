# Agent development

> **Status:** Planned. Today `/api/v1/chat` is a single AI SDK tool loop with two read-only tools.

Target approach (`packages/orchestration`, LangGraph JS):

1. Define state and a graph in `orchestration/graphs`.
2. Wrap domain packages as tools; validate inputs with Zod; route side effects through `guardrails`.
3. Use the Postgres checkpointer so runs survive crashes and wait for approvals
   (`human-oversight`).
4. Bound steps and cost; emit audit events per step.
5. Add agent evals (`evaluation/agents`).

See `.agents/skills/agent-orchestration/SKILL.md`.
