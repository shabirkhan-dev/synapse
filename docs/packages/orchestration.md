# `@synapse/orchestration`

Run multi-step agents and workflows with LangGraph JS — the only package that owns LangGraph.

> **Status:** Planned. Today `/api/v1/chat` is a single AI SDK tool loop.

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

`core`, `retrieval`, `generation`, `guardrails`, `human-oversight`, `memory`

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
