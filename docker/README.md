# Docker layout

Compose is split into **fragments** under `compose/` and merged by the root
`docker-compose.yml` via [`include`](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/)
(Compose **v2.20+**). Files use the Compose Specification — **no** obsolete top-level `version:` key.

| File | Role |
|------|------|
| `compose/postgres.yml` | Postgres 18 + pgvector (`pgvector/pgvector:0.8.7-pg18-trixie`), volume, healthcheck |
| `compose/nest-api.yml` | NestJS API image (Bun multi-stage build) |
| `compose/ai-api.yml` | Bun + Hono AI API (RAG on pgvector, streaming chat). Needs `AI_API_KEY` in `.env` |
| `compose/web.yml` | Next.js web image (standalone output) |
| `compose/rust-api.yml` | Optional Rust API (`--profile rust`) |

**Env:** copy `env.docker.example` from the repo root to `.env`.

```bash
cp env.docker.example .env
docker compose up -d --build
```

| Service | Host port (default) |
|---------|---------------------|
| Postgres | 5433 → 5432 |
| Nest API | 4000 |
| AI API | 8000 (`/api/docs` for the API reference) |
| Web | 3000 |
| Rust API (profile) | 3002 |

`NEXT_PUBLIC_NEST_API_URL` must be a URL the **browser** can reach (usually `http://localhost:4000`), not the Docker service hostname.

**Postgres only** (API/web on the host):

```bash
docker compose up -d postgres
```

**With Rust API:**

```bash
docker compose --profile rust up -d --build
```

**Manual fragment (no `include`):**

```bash
docker compose -f docker/compose/postgres.yml --project-name starter up -d
```

## Upgrading from Postgres 16

The compose Postgres image moved from `postgres:16-alpine` to `postgres:18-alpine`. A Postgres 18 server cannot open a
Postgres 16 data directory, and the 18 image stores data under `/var/lib/postgresql/18/docker`, so the service now uses a
new named volume, `postgres18_data`, mounted at `/var/lib/postgresql`. The old `postgres_data` volume is left untouched.

- **No data to keep:** run `docker compose up -d postgres`; migrations run against the empty database. Remove the old
  volume later with `docker volume rm <project>_postgres_data`.
- **Keep existing data:** dump it from the Postgres 16 setup before switching, then restore into 18:

```bash
# 1. On the old setup (postgres:16-alpine + postgres_data volume), while it is running:
docker compose exec -T postgres pg_dumpall -U starter > starter-pg16.sql
# 2. On this version: start the new server, then restore the dump.
docker compose up -d postgres
docker compose exec -T postgres psql -U starter -d postgres < starter-pg16.sql
```

## Switching to the pgvector image

`apps/ai-api` stores embeddings in a `vector(1536)` column, so the compose Postgres now runs
`pgvector/pgvector:0.8.7-pg18-trixie` (official Postgres 18 Debian image + the extension) instead of
`postgres:18-alpine`. It is the same major version and the same `postgres18_data` volume, so existing data opens as is.
The extension itself is created by the ai-api migration (`CREATE EXTENSION IF NOT EXISTS vector`).

Alpine (musl) and Debian (glibc) sort text differently, so rebuild text indexes once after the switch:

```bash
docker compose up -d postgres
docker compose exec postgres psql -U starter -d starter -c 'REINDEX DATABASE starter;'
docker compose exec postgres psql -U starter -d starter -c 'ALTER DATABASE starter REFRESH COLLATION VERSION;'
```

Hosted Postgres: Neon supports `vector` out of the box. Elsewhere, make sure the extension is installable
(`select * from pg_available_extensions where name = 'vector';`) before deploying ai-api.
