# Rule: database

- **PostgreSQL is the one store** for data, vectors (pgvector), keyword search (full-text), jobs
  (pg-boss) and audit. Add Redis or another store only with an ADR and evidence.
- Access goes through **Drizzle** in `adapters/database` (today: `apps/api/src/database`).
  Domain code depends on repository interfaces, not on Drizzle.
- Every schema change is a **migration** (`drizzle-kit generate`), reviewed and committed. Never
  edit an applied migration.
- Migrations must be safe to run twice and safe for a rolling deploy (expand → migrate → contract).
- Every row that belongs to a tenant/user carries its owner id and every query filters on it.
- Index what you filter and sort on. Vector columns use HNSW with the matching operator class.
- Embedding dimensions are part of the schema; changing models means a re-embedding job, not an
  in-place update.
- No raw string-concatenated SQL. Use Drizzle or `sql` template tags.
