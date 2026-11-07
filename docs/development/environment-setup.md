# Environment setup

> **Status:** Live.

## Prerequisites

- [Bun](https://bun.sh) `1.4.4` (pinned in `package.json` and `.mise.toml`)
- Docker Compose `v2.20+` for Postgres (pgvector)
- Optional: ShellCheck + shfmt (bash lint/format), Rust stable (once `crates/` exists)
- Or use the Dev Container in `.devcontainer/` (Bun, Rust, ShellCheck, shfmt)

## First run

```bash
git clone https://github.com/shabirkhan-dev/synapse.git
cd synapse
bun install                       # also installs Lefthook git hooks
docker compose up -d postgres     # Postgres 18 + pgvector on localhost:5433
cp .env.example .env              # the one env file: set AI_API_KEY (and Langfuse keys)
bun run db:migrate                # reads DATABASE_URL from .env
bun run dev                       # console :3000, api :8000
```

Check: <http://localhost:8000/api/v1/health> and <http://localhost:8000/api/docs>.

## Credentials: one place

All keys and settings live in the root **`.env`** (gitignored; template `.env.example`). Docker
compose reads it, and so do `bun run dev:api`, `db:migrate`, `eval:retrieval` and the API tests
(`bun --env-file=../../.env`). Empty values count as unset.

| Key | Needed for |
| --- | --- |
| `AI_API_KEY` | chat and embeddings (`/rag/*`, `/chat`) |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` | traces in Langfuse |
| `RESEND_API_KEY`, `EMAIL_FROM` | verification and password-reset emails (required in production; logged in development) |
| `API_TEST_DATABASE_URL` | opt-in pgvector integration tests |

For cloud agent sessions, add the same values in the cloud environment's settings, so new sessions
start with them.
