# Memory: known constraints

Things that are true today and easy to trip over. Remove an entry when it stops being true.

- **Auth is in-house** (ADR-0005): `/auth/sign-up|sign-in|refresh|sign-out|me`. Access tokens are
  checked by signature only, so they outlive sign-out by up to `AUTH_ACCESS_TOKEN_TTL_SECONDS` (15 min).
  Rate limits, email verification and password reset exist (syn-026); **no MFA, session list or
  organizations** yet: `sub` (user id) is the tenant. Unverified users can sign in
  (`emailVerifiedAt: null`). Emails are sent from `synapse@rabtx.dev` (rabtx.dev is verified in
  Resend; `synapse.rabtx.dev` is not, and the current key cannot send from it). Without `RESEND_API_KEY` emails go to the API log (development only;
  production requires the key). `auth_rate_limits` and used `auth_tokens` rows are never pruned yet
  (worker job, syn-024). Console pages `/verify-email` and `/reset-password` do not exist yet
  (syn-018). Tests may still mint tokens (`signAccessToken`).
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
- **Vector search needs pgvector ≥ 0.8** on the server: each search runs in a transaction with
  `set local hnsw.iterative_scan = relaxed_order`, so the owner filter cannot starve a tenant's
  results (syn-022). Limits: it stops after `hnsw.max_scan_tuples` (20,000) scanned rows, and rows
  HNSW keeps no links to (near-orthogonal outliers) stay unreachable for any index scan.
- **Hybrid scores are RRF scores** (≈0.016–0.033), not cosine; clients must not threshold `score` across modes.
- **Traces go to one destination:** Langfuse (both `LANGFUSE_*` keys set) or `OTEL_EXPORTER_OTLP_ENDPOINT`,
  not both; nothing is exported otherwise. Costs need `AI_MODEL_PRICES`. Prompt versions are not yet
  linked to Langfuse prompts.
- **One env file:** the root `.env` (template `.env.example`) feeds docker compose and host runs
  (`dev:api`, `db:migrate`, `eval:retrieval`, api tests via `--env-file=../../.env`). The console
  does not read it yet.
- **One global tracer provider per process:** tests that call `startTracing` must `shutdown()` after.
- **Reranking, query rewriting, queues (pg-boss), LangGraph** are planned, not installed.
- **No Rust crates yet**; CI has no Rust toolchain step.
- **CD deploy steps are placeholders** (`.github/workflows/cd.yml`).
- **Console has no UI and no tests**; `@synapse/ui` is not wired into it yet.
- Integration tests need Postgres with pgvector; they are skipped unless `API_TEST_DATABASE_URL` is set.
