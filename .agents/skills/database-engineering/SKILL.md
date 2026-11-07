---
name: database-engineering
description: Use when changing the Postgres schema, migrations, indexes, pgvector, full-text search or pg-boss queues.
---

# database-engineering

> Status: Live. `@synapse/database` (`packages/database`): client, schema (`src/schema/`), migrations
> (`migrations/`). Repositories stay in the owning module (`apps/api/src/modules/*/repositories/`).

## When to use

Any schema, index, query-performance or data-migration change.

## Workflow

1. Edit the Drizzle schema in `packages/database/src/schema/`, then `bun run db:generate` and review
   the SQL in `packages/database/migrations/`.
2. Make it rolling-deploy safe: add nullable/defaulted columns first, backfill, then tighten.
3. Add indexes for new filters/sorts; HNSW + `vector_cosine_ops` for vectors.
4. Scope tenant data by owner id and index that column.
5. Apply with `bun run db:migrate` (needs `DATABASE_URL`) against local Postgres
   (`docker compose up -d postgres`).
6. Run the integration test with `API_TEST_DATABASE_URL` set.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`
- Migration committed alongside the schema change
- Integration test passes against pgvector

## References

- `.agents/rules/database.md`
- ADR-0002
- `docs/runbooks/database-backup.md`
- `docs/development/backend-architecture.md` (database conventions)
