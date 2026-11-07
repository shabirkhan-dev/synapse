# Memory: known constraints

Things that are true today and easy to trip over. Remove an entry when it stops being true.

- **No token issuer yet.** `apps/api` verifies HS256 JWTs (`sub`, `sid`) signed with `JWT_SECRET`, but
  nothing issues them. Tests mint their own. Decided: in-house auth in `packages/security` + the API
  `auth` module (ADR-0005, syn-017).
- **Dedup is per owner, by normalized content only** (title/source/metadata ignored). Rows ingested
  before migration `0001_document_content_hash` have `content_hash = null` and are never matched.
- **drizzle-kit runs under Node:** code it imports must not use Bun-only APIs (`import.meta.dir`);
  use `import.meta.url`.
- **Chunk versions:** every new chunk stores `chunker_version` and `embedding_model`; rows from before
  migration `0002_chunk_versions` have nulls. Vector search only compares chunks with the current
  `embedding_model` (or null), so changing the embedding model hides old vectors until re-embedded
  (re-embedding job not built yet). Keyword search still finds them.
- **Embeddings are fixed at 1536 dimensions** (`vector(1536)`); the embedding model must match.
- **Migrations journal table** is still `__drizzle_migrations_ai_api` (`MIGRATIONS_TABLE` in
  `@synapse/database`, kept so existing databases do not re-run migrations).
- **Bundled migrations:** the API build copies `packages/database/migrations` to `dist/migrations`;
  `import.meta.dir` points at the bundle, so the folder is passed explicitly to `runMigrations`.
- **The API's RAG module composes the domain packages** (ingestion → knowledge → retrieval →
  generation). Streaming tool chat (`ChatService`, `chat.tools.ts`) still uses the AI SDK
  (`ai`) directly via the gateway's `chatModel`, until a streaming contract exists.
- **Controllers:** API route handlers are trivial (validate → service → `success`), so there are no
  `controllers/` folders yet; add one when a handler grows real HTTP logic.
- **Provenance is returned, not stored:** answers carry `provenance`, but nothing persists it until
  `audit` exists. Token counts in the context budget are estimates (~4 chars/token).
- **Retrieval eval uses hashing embeddings** (no key needed): it gates the pipeline, not embedding
  quality. Changing the dataset needs a `version` bump and a new baseline (`EVAL_UPDATE_BASELINE=true`).
- **Keyword search matches any term** and drops an English stopword list from the query only
  (`SEARCH_STOPWORDS` in `@synapse/database`); other languages get no stopword filtering.
  **HNSW post-filters by owner**: many tenants can starve a user's results (syn-022).
- **Hybrid scores are RRF scores** (≈0.016–0.033), not cosine; clients must not threshold `score` across modes.
- **Tracing is OTLP-only:** spans export only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set; no Langfuse
  exporter yet (syn-020). Costs are estimated only for models listed in `AI_MODEL_PRICES`.
- **One global tracer provider per process:** tests that call `startTracing` must `shutdown()` after.
- **Reranking, query rewriting, queues (pg-boss), LangGraph, Langfuse** are planned, not installed.
- **No Rust crates yet**; CI has no Rust toolchain step.
- **CD deploy steps are placeholders** (`.github/workflows/cd.yml`).
- **Console has no UI and no tests**; `@synapse/ui` is not wired into it yet.
- Integration tests need Postgres with pgvector; they are skipped unless `API_TEST_DATABASE_URL` is set.
