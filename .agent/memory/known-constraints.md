# Memory: known constraints

Things that are true today and easy to trip over. Remove an entry when it stops being true.

- **No token issuer.** `apps/api` verifies HS256 JWTs (`sub`, `sid`) signed with `JWT_SECRET`, but
  nothing in the repo issues them yet. Tests mint their own. `security/authentication` will own this.
- **Embeddings are fixed at 1536 dimensions** (`vector(1536)`); the embedding model must match.
- **Migrations journal table** is still `__drizzle_migrations_ai_api` (`MIGRATIONS_TABLE` in
  `@synapse/database`, kept so existing databases do not re-run migrations).
- **Bundled migrations:** the API build copies `packages/database/migrations` to `dist/migrations`;
  `import.meta.dir` points at the bundle, so the folder is passed explicitly to `runMigrations`.
- **RAG/chat live inside `apps/api`**, not yet in domain packages.
- **Controllers:** API route handlers are trivial (validate → service → `success`), so there are no
  `controllers/` folders yet; add one when a handler grows real HTTP logic.
- **Open decision:** adding `message` to success responses and nesting `error: { code }` is a
  breaking API change — decide during the `shared/` migration.
- **Keyword search, reranking, queues (pg-boss), LangGraph, Langfuse/OTel** are planned, not installed.
- **No Rust crates yet**; CI has no Rust toolchain step.
- **CD deploy steps are placeholders** (`.github/workflows/cd.yml`).
- **Console has no UI and no tests**; `@synapse/ui` is not wired into it yet.
- Integration tests need Postgres with pgvector; they are skipped unless `API_TEST_DATABASE_URL` is set.
