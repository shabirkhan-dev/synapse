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
