# Synapse

An AI platform monorepo — ingestion, knowledge, retrieval, generation and evaluation — built on
**Bun workspaces + Turborepo**.

Synapse started from the Rabtx starter and is being cleaned up step by step. Today it holds a
Bun + Hono AI API, a Next.js web app, and the shared UI, logger and TypeScript config packages.

Dual-licensed **MIT OR Apache-2.0**.

## Quick start

**Prerequisites**

- [Bun](https://bun.sh) `1.4.4` (pinned via `packageManager`)
- Optional: Docker Compose `v2.20+`

```bash
git clone https://github.com/shabirkhan-dev/synapse.git
cd synapse
bun install
bun run prepare
bun run dev
```

`bun run dev` starts every workspace. Run only the AI API with `bun run dev:ai`.

| App | Dev URL |
| --- | --- |
| Web | http://localhost:3000 |
| AI API | http://localhost:8000 — `/api/v1/health`, `/api/docs` |

To work on one app in isolation: `bun --cwd=apps/web run dev` (same pattern for `ai-api`).

## Layout

### Apps

| Path | What it is |
| --- | --- |
| `apps/ai-api` | Bun + Hono AI API — RAG on pgvector, streaming tool-calling chat (AI SDK) |
| `apps/web` | Next.js 16 — admin, marketing and chat screens; component playground at `/ui` |

### Packages

| Package | Path | Role |
| --- | --- | --- |
| `@synapse/ui` | `packages/ui` | shadcn base — the unopinionated primitives |
| `@rabtx/ui` | `packages/rabtx` | Polished component layer used by the web app (see [DESIGN.md](DESIGN.md)) |
| `@synapse/logger` | `packages/logger` | Shared structured logging |
| `@synapse/typescript-config` | `packages/typescript-config` | Base tsconfigs every workspace extends |

### Everything else

| Path | Purpose |
| --- | --- |
| `.agents/` | Agent rules, roles, skills and the coordination board |
| `docker/` | Compose fragments: Postgres (pgvector), AI API, web |
| `scripts/` | Bash utilities, plus architecture and naming checks |
| `.github/workflows/` | `ci.yml`, `cd.yml`, `security.yml` |
| `.devcontainer/` | Bun + Rust + Bash tooling |

## Commands

| Command | Does |
| --- | --- |
| `bun run dev` / `dev:ai` | All dev servers / AI API only |
| `bun run build` | Build every app |
| `bun run lint` / `lint:fix` | oxlint, plus ShellCheck over `scripts/` |
| `bun run format` | Format TS/JS and shell |
| `bun run typecheck` | TypeScript across workspaces |
| `bun run test` / `test:coverage` | Unit tests / coverage gates |
| `bun run test:e2e:web` | Playwright e2e for web |
| `bun run architecture:check` | Import-boundary rules |
| `bun run naming:check` | File and symbol naming rules |
| `bun run preflight` | `lint` + `typecheck` + `test` — run before pushing |

## Tooling

- **Bun** workspaces and **Turborepo** for the task graph
- **oxlint** for linting and **oxfmt** for formatting TS/JS — tabs, line width 100
- **Lefthook** pre-commit and commit-msg, enforcing Conventional Commits
- Bash: ShellCheck + shfmt

## Docker

```bash
cp env.docker.example .env
docker compose up -d --build
```

Web `:3000`, AI API `:8000`, Postgres (pgvector) on host `:5433`. More in
[docker/README.md](docker/README.md).

## Dev Container

`.devcontainer/` installs **Bun**, **Rust** and the Bash lint tools.

```text
Reopen in Container → bun run prepare → bun run dev
```

See [.devcontainer/README.md](.devcontainer/README.md).

## Docs

[PROJECT.md](PROJECT.md), [AGENTS.md](AGENTS.md), [apps/ai-api/README.md](apps/ai-api/README.md).

## License

Dual-licensed under **MIT** or **Apache-2.0**, at your option —
[LICENSE-MIT](LICENSE-MIT), [LICENSE-Apache-2.0](LICENSE-Apache-2.0).
