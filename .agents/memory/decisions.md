# Memory: decisions

Decisions already made. Formal records: `docs/decisions/adr/`.

| Date | Decision | Where |
| --- | --- | --- |
| 2026-11-07 | Modular monolith in one Bun + Turborepo repo | ADR-0001 |
| 2026-11-07 | PostgreSQL for data, vectors, keyword search, jobs, cache and audit | ADR-0002 |
| 2026-11-07 | All LLM calls go through a provider abstraction (`model-gateway`) | ADR-0003 |
| 2026-11-07 | Rust via napi-rs, in-process, behind `packages/native` | ADR-0004 |
| 2026-11-07 | Keep oxlint + oxfmt (not Biome) and the bash boundary checks (not dependency-cruiser) | this file |
| 2026-11-07 | Console UI starts from zero on `@synapse/ui` (shadcn, Base UI, `base-mira`, HugeIcons) | this file |
| 2026-11-07 | Starter apps removed: mobile, nest-api, docs, rust; starter packages removed: rabtx, logger | this file |
| 2026-11-07 | API keeps a small local logger until `observability` exists | this file |
| 2026-11-07 | Backend: domain modules (routes → controllers → services → repositories), shared constants/errors/responses, central config; frontend: feature modules with containers, split query/mutation hooks, plain services, one API client | `docs/development/backend-architecture.md`, `frontend-architecture.md` |
| 2026-11-07 | Layering rules enforced by `scripts/architecture/check-layers.sh` in `architecture:check` | this file |
| 2026-11-07 | Database is its own package `@synapse/database` (client, schema, migrations, runner), usable by any app or package; repositories stay in modules | `docs/packages/database.md` |
| 2026-11-07 | `apps/api` restructured: `config/` domain configs, `shared/` constants/errors/responses, `infrastructure/`, `routes/`, per-layer module folders; envelope unchanged | `docs/development/backend-architecture.md` |
| 2026-11-07 | Response envelope: `message` on every response; errors nested as `error: { code, details? }` | `docs/api/conventions.md` |
| 2026-11-07 | Agent files live in `.agents/` (cross-tool standard); `CLAUDE.md`, `opencode.json` and `.claude/skills` wire Claude Code and OpenCode to it | `docs/agents/tool-compatibility.md` |
| 2026-11-07 | Work is tracked as board cards (`syn-<n>`) with `.agents/plans/roadmap.md`; every reply ends with a Roadmap block | `.agents/rules/progress-tracking.md` |
| 2026-11-07 | Models are called through `ModelGateway` (`@synapse/core/contracts`), implemented in `@synapse/adapters/model-gateway`; vendor-SDK imports in domain packages fail `architecture:check` | ADR-0003 |
| 2026-11-07 | Ingest dedups per owner by SHA-256 of normalized content (`@synapse/ingestion`); duplicates return the existing document with `200` | `docs/packages/ingestion.md` |
| 2026-11-07 | Chunking and embedding preparation live in `@synapse/knowledge`; each chunk records `chunker_version` and `embedding_model` | `docs/packages/knowledge.md` |
| 2026-11-07 | Retrieval defaults to hybrid (pgvector + Postgres full-text `simple`, fused with RRF k=60) in `@synapse/retrieval`; vector search filters by embedding model | `docs/packages/retrieval.md` |
| 2026-11-07 | Prompts are versioned in `@synapse/generation` (`id@version`); answers return `citations` and `provenance` (chat model, prompt version, embedding model, chunker version, usage) | `docs/packages/generation.md` |
| 2026-11-07 | Logging and tracing via `@synapse/observability` (structured logs with trace ids, OpenTelemetry OTLP/HTTP, GenAI spans, cost from `AI_MODEL_PRICES`); the API's local logger is removed; only observability may import `@opentelemetry/*` | `docs/packages/observability.md` |
| 2026-11-07 | Authentication is built in-house (users, sessions, tokens in our Postgres), owned by `packages/security` + the API `auth` module; no external identity provider or auth library | ADR-0005 |
| 2026-11-07 | Keyword search matches any term (OR), with query-side English stopwords and `-term` exclusions kept | `docs/packages/retrieval.md` |
| 2026-11-07 | One env file: root `.env` (template `.env.example`) for docker compose and host runs; `env.docker.example` and `apps/api/.env.example` removed | `docs/development/environment-setup.md` |
| 2026-11-07 | Traces go to Langfuse over its OTLP endpoint (no Langfuse SDK); cost on `gen_ai.usage.cost` | `docs/packages/observability.md` |
| 2026-11-07 | Retrieval quality is gated in CI by `bun run eval:retrieval` (seed dataset, hashing embeddings, real Postgres stack) against committed baselines; search results are deterministic (content tie-break) | `docs/packages/evaluation.md` |
