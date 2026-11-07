# Rule: architecture

Applies to every change. Full rationale: `docs/architecture/`.

1. **Modular monolith.** One repo, one deployable API (`apps/api`), one worker (`apps/worker`,
   planned), one console (`apps/console`). Capabilities live in `packages/*`, not in apps.
2. **One owner per capability.** Each capability has exactly one package that owns it:
   feedback → `human-oversight`, event history → `audit`, LangGraph → `orchestration`,
   vendor SDKs → `adapters` / `providers`. Never re-implement a capability in a second place.
3. **Domain packages never import vendor SDKs.** `ingestion`, `knowledge`, `retrieval`,
   `generation`, `orchestration` and friends depend on contracts from `core`. Only `database`
   (Drizzle, postgres.js), `adapters/` and `providers/` import OpenAI, Anthropic, Cohere, Langfuse,
   pg-boss, database drivers and so on.
4. **Dependencies point inward.** apps → domain packages → `core`. A package never imports an app,
   and `core` imports nothing from the workspace. See `docs/architecture/dependency-architecture.md`.
5. **Every long job saves its state** (checkpoint) and can resume after a crash or deploy.
6. **Every answer is traceable.** Record the model, prompt version and embedding version that
   produced it.
7. **Packages are internal modules first.** Expose a small public entry point per package; deep
   imports into another package's internals are forbidden.
8. **Build order:** `core` → `adapters` → `ingestion` → `knowledge` → `retrieval` → `generation` →
   `observability` → `evaluation`. Add `orchestration`, `human-oversight` and `memory` once that
   path works.

If a change breaks one of these, stop and write an ADR in `docs/decisions/adr/` first.
