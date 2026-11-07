# Packages

Each folder directly under `packages/` is one workspace package (`@synapse/<name>`); folders inside
it are internal modules. Rules: `.agents/rules/architecture.md`. How to add one:
`docs/development/package-development.md`.

## Existing today

| Package | Purpose |
| --- | --- |
| `@synapse/ui` | shadcn/ui on Base UI (`base-mira`), HugeIcons, Tailwind v4 — see `packages/ui/README.md` |
| `@synapse/typescript-config` | Shared tsconfig bases (`base.json`, `nextjs.json`) |
| `@synapse/core` | Errors, config loading, shared types (contracts/events/utils to come) — see [core.md](core.md) |
| `@synapse/database` | Drizzle client, schema, migrations and runner for Postgres + pgvector — see [database.md](database.md) |
| `@synapse/adapters` | Model gateway (AI SDK, OpenAI-compatible) implementing the `core` contract — see [adapters.md](adapters.md) |
| `@synapse/ingestion` | Normalization, content-hash dedup, ingestion pipeline — see [ingestion.md](ingestion.md) |
| `@synapse/knowledge` | Chunking, embedding preparation, chunk versions — see [knowledge.md](knowledge.md) |
| `@synapse/retrieval` | Vector, keyword and hybrid (RRF) retrieval — see [retrieval.md](retrieval.md) |
| `@synapse/generation` | Versioned prompts, budgeted context, citations, answer provenance — see [generation.md](generation.md) |
| `@synapse/observability` | Structured logs, OpenTelemetry tracing, LLM usage and cost — see [observability.md](observability.md) |
| `@synapse/evaluation` | Retrieval datasets, recall@k / MRR, baselines, CI regression — see [evaluation.md](evaluation.md) |

## Platform packages (from the plan)

| Package | Purpose | Status |
| --- | --- | --- |
| [`core`](core.md) | Shared types, contracts (interfaces), errors, events, config and utilities that every other package builds on. | Live (errors, config, types, contracts) |
| [`ingestion`](ingestion.md) | Bring content in from sources and turn it into normalized, deduplicated documents with their access rules. | Live (normalize, dedup, pipeline) |
| [`knowledge`](knowledge.md) | Turn documents into searchable, versioned knowledge: chunks, enrichment, embeddings and indexes. | Live (chunking, embeddings, versions) |
| [`retrieval`](retrieval.md) | Find the right knowledge for a query, safely: rewrite, search, fuse, rerank and filter. | Live (vector, keyword, hybrid) |
| [`generation`](generation.md) | Produce answers from context: providers, prompts, context assembly, completion, citations and structured output. | Live (prompts, context, citations, provenance) |
| [`orchestration`](orchestration.md) | Run multi-step agents and workflows with LangGraph JS — the only package that owns LangGraph. | Planned |
| [`human-oversight`](human-oversight.md) | Keep humans in the loop: approvals, review queues, decisions, escalation and feedback. | Planned |
| [`audit`](audit.md) | The single owner of event history: who did what, with which inputs, producing which output. | Planned |
| [`guardrails`](guardrails.md) | Keep inputs, retrieval, tools and outputs within policy. | Planned |
| [`memory`](memory.md) | Agent and conversation memory: working, conversation, semantic and episodic, with lifecycle rules. | Planned (after the core RAG path works) |
| [`evaluation`](evaluation.md) | Measure quality: datasets and scorers for retrieval, generation, agents and safety, plus regression runs. | Live (retrieval evals, CI regression) |
| [`observability`](observability.md) | See what the system does: tracing, instrumentation, cost tracking and exporters. | Live (logs, tracing, LLM usage/cost) |
| [`security`](security.md) | Who you are and what you may do: authentication, authorization, tenancy, permissions, PII and secrets. | Partly live: HS256 JWT verification in `apps/api/src/modules/auth` |
| [`reliability`](reliability.md) | Make external calls and jobs dependable: retry, circuit breakers, idempotency, timeouts, fallbacks, health. | Planned |
| [`adapters`](adapters.md) | Implement `core` contracts against infrastructure: vector store, cache, queue, storage and the model gateway. | Live (model gateway) |
| [`providers`](providers.md) | Thin vendor integrations: OpenAI, Anthropic, Google, Cohere and Langfuse. | Planned |
| [`native`](native.md) | TypeScript wrapper over the Rust crates (napi-rs). | Planned |

Build order: `core` → `adapters` → `ingestion` → `knowledge` → `retrieval` → `generation` →
`observability` → `evaluation`, then `orchestration`, `human-oversight` and `memory`.
