# `@synapse/database`

PostgreSQL access for the whole platform: the Drizzle client, the schema, migrations and the
migration runner. Any app or package that needs Postgres depends on this package.

> **Status:** Live.

## Internal modules

`src/client/ src/schema/ src/migrations/` + `migrations/` (generated SQL) + `drizzle.config.ts`

## Owns

- `createDatabase(options)` — postgres.js + Drizzle client (`Database` type), SSL for Neon
- The Drizzle schema (today: `users`, `auth_sessions`, `auth_tokens`, `auth_rate_limits`, `job_checkpoints`, `rag_documents`, `rag_chunks`, `EMBEDDING_DIMENSIONS = 1536`)
- Generated, reviewed SQL migrations and the journal table (`MIGRATIONS_TABLE`)
- `runMigrations(db, folder)` and the `bun run db:migrate` CLI

## Does not own

- Queries for a domain — **repositories stay in the module that owns the data**
  (e.g. `apps/api/src/modules/rag/repositories/`)
- Business rules, tenancy decisions (callers pass the tenant/owner id explicitly)

## Depends on

`core` (config loading for the CLI), `drizzle-orm`, `postgres`, `zod`

## Public API

| Export | Import | What it does |
| --- | --- | --- |
| `createDatabase`, `Database`, `DatabaseOptions` | `@synapse/database` | Create a client: `{ db, client, close }` |
| `runMigrations(db, folder)` | `@synapse/database` | Apply SQL migrations from a folder |
| `MIGRATIONS_TABLE`, `sourceMigrationsFolder` | `@synapse/database` | Journal table name; the package's own `migrations/` (source only) |
| tables + row types, `EMBEDDING_DIMENSIONS` | `@synapse/database/schema` (also re-exported from the root) | Drizzle schema |

## Commands

| Command | Does |
| --- | --- |
| `bun run db:generate` | Generate a migration from schema changes into `packages/database/migrations/` |
| `bun run db:migrate` | Apply migrations (needs `DATABASE_URL`, optional `DATABASE_SSL`) |

## Notes

A bundle (e.g. the API image) must ship its own copy of `migrations/` and pass that path to
`runMigrations`: inside a bundle `import.meta.dir` points at the bundle, not this package. The API
build copies it to `apps/api/dist/migrations`.
