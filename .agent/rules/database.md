# Rule: database

- **PostgreSQL is the one store** for data, vectors (pgvector), keyword search (full-text), jobs
  (pg-boss) and audit. Add Redis or another store only with an ADR and evidence.
- **`@synapse/database`** (`packages/database`) owns the client, schema, migrations and the
  migration runner. Any app or package that needs Postgres depends on it. Repositories stay in the
  module that owns the data; services depend on repository interfaces, not on Drizzle.
- **Naming:** tables snake_case plural; columns snake_case; `id` primary keys; `{entity}_id` foreign
  keys; `created_at` / `updated_at`; booleans `is_*`; every index explicitly named.
- Only **repositories** query the database. Tenant scope is an explicit argument
  (`findById({ documentId, tenantId })`), never inferred from global state.
- Use explicit transactions for multi-step writes; never load unbounded collections; soft delete
  only when product or compliance requires it.
- Every schema change is a **migration** (`drizzle-kit generate`), reviewed and committed. Never
  edit an applied migration.
- Migrations must be safe to run twice and safe for a rolling deploy (expand → migrate → contract).
- Every row that belongs to a tenant/user carries its owner id and every query filters on it.
- Index what you filter and sort on. Vector columns use HNSW with the matching operator class.
- Embedding dimensions are part of the schema; changing models means a re-embedding job, not an
  in-place update.
- No raw string-concatenated SQL. Use Drizzle or `sql` template tags.
