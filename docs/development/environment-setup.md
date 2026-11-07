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
cp apps/api/.env.example apps/api/.env   # set AI_API_KEY
bun --cwd=apps/api run db:migrate
bun run dev                       # console :3000, api :8000
```

Check: <http://localhost:8000/api/v1/health> and <http://localhost:8000/api/docs>.
