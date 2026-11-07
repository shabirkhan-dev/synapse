---
name: database-engineering
description: Use when changing the Postgres schema, migrations, indexes, pgvector, full-text search or pg-boss queues.
---

# database-engineering

> Status: Live. Schema in `apps/api/src/database/schema`, migrations in `apps/api/src/database/migrations` (Drizzle).

## When to use

Any schema, index, query-performance or data-migration change.

## Workflow

1. Edit the Drizzle schema, then `bun --cwd=apps/api run db:generate` and review the SQL.
2. Make it rolling-deploy safe: add nullable/defaulted columns first, backfill, then tighten.
3. Add indexes for new filters/sorts; HNSW + `vector_cosine_ops` for vectors.
4. Scope tenant data by owner id and index that column.
5. Apply with `bun --cwd=apps/api run db:migrate` against local Postgres (`docker compose up -d postgres`).
6. Run the integration test with `API_TEST_DATABASE_URL` set.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agent/rules/documentation.md`
- Migration committed alongside the schema change
- Integration test passes against pgvector

## References

- `.agent/rules/database.md`
- ADR-0002
- `docs/runbooks/database-backup.md`
- `docs/development/backend-architecture.md` (database conventions)
