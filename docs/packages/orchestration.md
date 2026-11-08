# `@synapse/orchestration`

Run multi-step agents and workflows with LangGraph JS — the only package that owns LangGraph.

> **Status:** Live (RAG answer graph, approval-gated actions, Postgres checkpoints, resume) ·
> Planned (agent tools, audit events). `/api/v1/chat` is still a single AI SDK tool loop.

## Internal modules

`graphs/ state/ checkpoints/ routing/ tools/ recovery/`

## Owns

- LangGraph graphs and state
- Checkpoints (Postgres) and recovery
- Routing between steps
- Tool definitions that wrap domain packages

## Does not own

- Approvals and feedback (→ `human-oversight`)
- Event history (→ `audit`)

## Depends on

`core` and LangGraph JS (`@langchain/langgraph` 1.5.2, pinned). Domain work reaches graphs as
ports (plain functions), so the package does not import `retrieval` or `generation`. Later:
`guardrails`, `human-oversight`, `memory`.

## Public API

| Export | What it does |
| --- | --- |
| `createRagAnswerGraph({ ports, maxAttempts?, checkpointer? })` → `{ run, resume }` | retrieve → generate → if the answer cites nothing and attempts remain, generate again (attempt number passed to `ports.answer`, so the caller can use a stricter prompt) → end. Nothing retrieved ⇒ no model call |
| `RagAnswerPorts`, `RagAnswerRun`, `CitedAnswer` | `retrieve({ question, context })`, `answer({ question, passages, attempt, context })`; `context` is the caller's per-run data (checkpointed, so JSON) |
| `createApprovalGatedGraph({ ports, checkpointer })` → `{ start, decide, outcome }`, `ApprovalDecision`, `ApprovalGatedOutcome` | request approval (`approvalId` = thread id, so a repeated step is a no-op) → pause with `interrupt` → on `decide`: run `ports.execute` if approved, else end. `decide` after the run finished returns the outcome without running again |
| `MemorySaver`, `BaseCheckpointSaver` | In-memory checkpoints (tests) and the checkpointer type; Postgres: `createPostgresCheckpointer` in `@synapse/adapters/checkpointer` |

**Checkpoints and resume:** with a checkpointer, `run(input, threadId)` saves state after every
step. If the process dies mid-run, `resume(threadId)` (any process, same database) continues from
the last finished step: a crash during generation re-runs only generation, never retrieval. Steps are
bounded (`recursionLimit` 10).

**Used by:** `apps/api` `RagService.answer` (`POST /rag/query`): attempt 1 uses `rag-answer@2`,
the retry uses `rag-answer-cited@2`; provenance names the prompt that produced the returned answer.
API runs are in-request, so they use no checkpointer.
