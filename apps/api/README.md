# api

Bun + Hono + TypeScript AI service: RAG on Postgres + pgvector and streaming, tool-calling chat with
the Vercel AI SDK. API reference at `/api/docs` (OpenAPI at `/api/openapi.json`).
Structure follows `docs/development/backend-architecture.md`.

```bash
cp .env.example .env                       # set AI_API_KEY (and JWT_SECRET outside development)
docker compose up -d postgres              # from the repo root: Postgres + pgvector
DATABASE_URL=postgresql://synapse:synapse@localhost:5433/synapse bun run db:migrate   # repo root
bun run dev                                # http://localhost:8000/api/v1/health
```

| Script | Does |
| --- | --- |
| `dev` | `bun --watch src/server.ts` |
| `build` / `start` | Bundle `server.js` + `migrate.js` and copy migrations to `dist/` / run the bundle |
| `test` / `test:coverage` | `bun test` (LLM and embeddings mocked; set `API_TEST_DATABASE_URL` for pgvector) |
| `typecheck` / `lint` | `tsc --noEmit` / oxlint |

Database schema and migrations live in [`@synapse/database`](../../packages/database/README.md)
(`bun run db:generate`, `bun run db:migrate` from the repo root).

## Layout

```text
src/
  server.ts             # load config once, wire repository → services, Bun.serve
  migrate.ts            # migration entry for the built image (dist/migrate.js)
  app.ts                # createApp: middleware, docs, error handler
  config/               # env.ts (Zod) + app/auth/database/ai/rag/migration configs, index.ts
  shared/
    constants/          # HTTP_STATUS, ERROR_CODES, RESPONSE_MESSAGES
    errors/             # AppError, central error handler
    responses/          # success(), failure(), envelope schemas
    middleware/         # request id
    types/              # AppBindings, AuthUser
  infrastructure/
    logger/             # leveled logger
    ai/                 # OpenAI-compatible chat + embedding models
  routes/index.ts       # mounts module routers, applies auth
  modules/
    auth/               # constants/ middleware/ services/
    chat/               # constants/ routes/ schemas/ services/ tools/
    health/             # constants/ routes/ schemas/
    rag/                # constants/ mappers/ repositories/ routes/ schemas/ services/ types/
test/                   # bun test (mocks in helpers.ts)
```

Request flow: route → service → repository → database. Services throw `AppError` with codes from
`shared/constants` or the module's `constants/`; only `shared/responses` builds responses.
`bun run architecture:check` enforces the layering.
