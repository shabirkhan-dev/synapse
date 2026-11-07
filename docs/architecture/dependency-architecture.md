# Dependency architecture

> **Status:** Live (rules) · enforcement grows as packages land.

```text
apps (api, worker, console)
   │
   ▼
orchestration ──▶ retrieval, generation, guardrails, human-oversight, memory
   │
   ▼
ingestion · knowledge · retrieval · generation · human-oversight · audit · guardrails
memory · evaluation · observability · security · reliability
   │                                   (depend on contracts only)
   ▼
core  ◀──────────── adapters ──▶ providers ──▶ vendor SDKs
                       │
                       └──▶ native ──▶ crates/bindings
```

## Rules

1. `core` imports nothing from the workspace.
2. Domain packages import `core` (and, where listed in their page, other domain packages).
3. Only `adapters` and `providers` import vendor SDKs or database drivers.
4. Apps wire implementations (adapters) into domain packages at startup (composition root).
5. No package imports an app. No cycles.
6. Import another package only through its public entry point.
