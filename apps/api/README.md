# api

Bun + Hono + TypeScript AI service: RAG on Postgres + pgvector and streaming, tool-calling chat with
the Vercel AI SDK. API reference at `/api/docs` (OpenAPI at `/api/openapi.json`).
Structure follows `docs/development/backend-architecture.md`.

```bash
cp .env.example .env            # repo root: the one env file; set AI_API_KEY (and Langfuse keys)
docker compose up -d postgres   # Postgres + pgvector
bun run db:migrate              # reads DATABASE_URL from the root .env
bun run dev:api                 # http://localhost:8000/api/v1/health
```

| Script | Does |
| --- | --- |
| `dev` | `bun --watch src/server.ts` (loads the root `.env`) |
| `build` / `start` | Bundle `server.js` + `migrate.js` and copy migrations to `dist/` / run the bundle |
| `test` / `test:coverage` | `bun test` (LLM and embeddings mocked; set `API_TEST_DATABASE_URL` for pgvector) |
| `typecheck` / `lint` | `tsc --noEmit` / oxlint |

Database schema and migrations live in [`@synapse/database`](../../packages/database/README.md)
(`bun run db:generate`, `bun run db:migrate` from the repo root).

## Layout

```text
src/
  server.ts             # config, tracing + logger (@synapse/observability), instrumented model gateway, services, Bun.serve
  migrate.ts            # migration entry for the built image (dist/migrate.js)
  app.ts                # createApp: middleware, docs, error handler
  config/               # env.ts (Zod) + app/auth/database/ai/rag/migration configs, index.ts
  shared/
    constants/          # HTTP_STATUS, ERROR_CODES, RESPONSE_MESSAGES
    errors/             # AppError, central error handler
    responses/          # success(), failure(), envelope schemas
    middleware/         # request id, request tracing (span + log per request)
    types/              # AppBindings, AuthUser
  infrastructure/email/ # email sender: Resend, or the log in development
  routes/index.ts       # mounts module routers, applies auth
  modules/
    audit/              # constants/ mappers/ repositories/ routes/ schemas/ (event history)
    auth/               # constants/ mappers/ middleware/ repositories/ routes/ schemas/ services/ types/
    chat/               # constants/ routes/ schemas/ services/ tools/
    guardrails/         # constants/ services/ (policy checks + audit)
    health/             # constants/ routes/ schemas/
    memory/             # constants/ mappers/ repositories/ routes/ schemas/ services/ types/ (conversations, facts)
    organizations/      # constants/ mappers/ repositories/ routes/ schemas/ services/ types/ (tenants, roles)
    oversight/          # constants/ mappers/ repositories/ routes/ schemas/ services/ (approvals, feedback)
    rag/                # constants/ mappers/ repositories/ routes/ schemas/ services/ types/
test/                   # bun test (mocks in helpers.ts)
```

Request flow: route → service → repository → database. Services throw `AppError` with codes from
`shared/constants` or the module's `constants/`; only `shared/responses` builds responses.
`bun run architecture:check` enforces the layering.
