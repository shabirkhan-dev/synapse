# Environment setup

> **Status:** Live.

## Prerequisites

- [Bun](https://bun.sh) `1.4.4` (pinned in `package.json` and `.mise.toml`)
- Docker Compose `v2.20+` for Postgres (pgvector)
- Optional: ShellCheck + shfmt (bash lint/format), Rust stable (once `crates/` exists)
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) and access to the `synapse` project
- Or use the Dev Container in `.devcontainer/` (Bun, Rust, ShellCheck, shfmt)

## First run

```bash
git clone https://github.com/shabirkhan-dev/synapse.git
cd synapse
bun install                       # also installs Lefthook git hooks
docker compose up -d postgres     # Postgres 18 + pgvector on localhost:5433
doppler login && doppler setup --no-interactive && bun run env:pull   # .env from Doppler (docs/development/secrets.md)
# no Doppler access? cp .env.example .env and fill in the keys
bun run db:migrate                # reads DATABASE_URL from .env
bun run dev                       # console :3000, api :8000
```

Check: <http://localhost:8000/api/v1/health> and <http://localhost:8000/api/docs>.

## Credentials: one place

All keys and settings live in **Doppler** (project `synapse`, config `dev`) and are pulled into the
root **`.env`** (gitignored; documented in `.env.example`) with `bun run env:pull`; see
[secrets.md](secrets.md). Docker
compose reads it, and so do `bun run dev:api`, `db:migrate`, `eval:retrieval` and the API tests
(`bun --env-file=../../.env`). Empty values count as unset.

| Key | Needed for |
| --- | --- |
| `AI_API_KEY` | chat and embeddings (`/rag/*`, `/chat`) |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` | traces in Langfuse |
| `RESEND_API_KEY`, `EMAIL_FROM` | verification and password-reset emails (required in production; logged in development) |
| `API_TEST_DATABASE_URL` | opt-in pgvector integration tests |

Cloud agent sessions pull the same `.env` from Doppler with a service token (see
[secrets.md](secrets.md#agent-sessions-claude-code-on-the-web)).
