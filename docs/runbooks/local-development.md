# Local development

> **Status:** Live.

```bash
bun install
docker compose up -d postgres            # pgvector on :5433
cp apps/api/.env.example apps/api/.env   # set AI_API_KEY
DATABASE_URL=postgresql://synapse:synapse@localhost:5433/synapse bun run db:migrate
bun run dev                              # or dev:api / dev:console
```

Full stack in Docker: `cp env.docker.example .env && docker compose up -d --build`
(console :3000, api :8000, Postgres :5433).

| Problem | Fix |
| --- | --- |
| `/health/ready` returns 503 | Postgres not running: `docker compose up -d postgres` |
| `AI_API_KEY is not set` warning | Set it in `apps/api/.env` |
| `JWT_SECRET must be changed` at boot | You are in `NODE_ENV=production` with the dev secret |
| Hooks not running | `bun run prepare` |
