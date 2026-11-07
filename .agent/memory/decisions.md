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
