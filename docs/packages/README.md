# Packages

Each folder directly under `packages/` is one workspace package (`@synapse/<name>`); folders inside
it are internal modules. Rules: `.agent/rules/architecture.md`. How to add one:
`docs/development/package-development.md`.

## Existing today

| Package | Purpose |
| --- | --- |
| `@synapse/ui` | shadcn/ui on Base UI (`base-mira`), HugeIcons, Tailwind v4 — see `packages/ui/README.md` |
| `@synapse/typescript-config` | Shared tsconfig bases (`base.json`, `nextjs.json`) |

## Platform packages (from the plan)

| Package | Purpose | Status |
| --- | --- | --- |
| [`core`](core.md) | Shared types, contracts (interfaces), errors, events, config and utilities that every other package builds on. | Planned — first package in the build order |
| [`ingestion`](ingestion.md) | Bring content in from sources and turn it into normalized, deduplicated documents with their access rules. | Planned |
| [`knowledge`](knowledge.md) | Turn documents into searchable, versioned knowledge: chunks, enrichment, embeddings and indexes. | Planned |
| [`retrieval`](retrieval.md) | Find the right knowledge for a query, safely: rewrite, search, fuse, rerank and filter. | Partly live: top-k cosine vector search in `apps/api` |
| [`generation`](generation.md) | Produce answers from context: providers, prompts, context assembly, completion, citations and structured output. | Partly live: OpenAI-compatible chat + embeddings via the AI SDK in `apps/api/src/modules/ai` |
| [`orchestration`](orchestration.md) | Run multi-step agents and workflows with LangGraph JS — the only package that owns LangGraph. | Planned |
| [`human-oversight`](human-oversight.md) | Keep humans in the loop: approvals, review queues, decisions, escalation and feedback. | Planned |
| [`audit`](audit.md) | The single owner of event history: who did what, with which inputs, producing which output. | Planned |
| [`guardrails`](guardrails.md) | Keep inputs, retrieval, tools and outputs within policy. | Planned |
| [`memory`](memory.md) | Agent and conversation memory: working, conversation, semantic and episodic, with lifecycle rules. | Planned (after the core RAG path works) |
| [`evaluation`](evaluation.md) | Measure quality: datasets and scorers for retrieval, generation, agents and safety, plus regression runs. | Planned |
| [`observability`](observability.md) | See what the system does: tracing, instrumentation, cost tracking and exporters. | Planned |
| [`security`](security.md) | Who you are and what you may do: authentication, authorization, tenancy, permissions, PII and secrets. | Partly live: HS256 JWT verification in `apps/api/src/modules/auth` |
| [`reliability`](reliability.md) | Make external calls and jobs dependable: retry, circuit breakers, idempotency, timeouts, fallbacks, health. | Planned |
| [`adapters`](adapters.md) | Implement `core` contracts against infrastructure: database, vector store, cache, queue, storage and the model gateway. | Planned |
| [`providers`](providers.md) | Thin vendor integrations: OpenAI, Anthropic, Google, Cohere and Langfuse. | Planned |
| [`native`](native.md) | TypeScript wrapper over the Rust crates (napi-rs). | Planned |

Build order: `core` → `adapters` → `ingestion` → `knowledge` → `retrieval` → `generation` →
`observability` → `evaluation`, then `orchestration`, `human-oversight` and `memory`.
