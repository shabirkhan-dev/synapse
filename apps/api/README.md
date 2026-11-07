# api

Bun + Hono + TypeScript AI service: RAG on Postgres + pgvector and streaming, tool-calling chat with
the Vercel AI SDK. API reference at `/api/docs` (OpenAPI at `/api/openapi.json`).

```bash
cp .env.example .env        # set AI_API_KEY (and JWT_SECRET outside development)
bun run db:migrate          # needs Postgres with pgvector (docker compose up -d postgres)
bun run dev                 # http://localhost:8000/api/v1/health, docs at /api/docs
```

| Script | Does |
| --- | --- |
| `dev` | `bun --watch src/index.ts` |
| `build` / `start` | Bundle to `dist/` (index + migrate + SQL) / run the bundle |
| `test` / `test:coverage` | `bun test` (LLM and embeddings mocked) |
| `typecheck` / `lint` | `tsc --noEmit` / oxlint |
| `db:generate` / `db:migrate` | drizzle-kit generate / apply migrations |

Layout:

```text
src/
  index.ts              # Bun.serve entry: env, db, models, app
  app.ts                # createApp(deps): middleware, routes, OpenAPI, errors
  config/env.ts         # Zod env schema
  common/               # envelopes, AppError, request id, error handler
  database/             # drizzle client, schema, migrations, migrate.ts
  modules/
    auth/               # HS256 JWT verification
    ai/                 # OpenAI-compatible provider (chat + embeddings)
    rag/                # chunker, repository, service, routes
    chat/               # tools + streaming route
    health/             # liveness + readiness
test/                   # bun test (mocks in helpers.ts)
```
