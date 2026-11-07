# Synapse

An AI platform monorepo — ingestion, knowledge, retrieval, generation and evaluation — built on
**Bun workspaces + Turborepo**.

Synapse started from the Rabtx starter and is being cleaned up step by step. Today it holds a
Bun + Hono API, a bare Next.js console, and the shared UI, logger and TypeScript config packages.

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

`bun run dev` starts every workspace. Run one app with `bun run dev:api` or `bun run dev:console`.

| App | Dev URL |
| --- | --- |
| Console | http://localhost:3000 |
| API | http://localhost:8000 — `/api/v1/health`, `/api/docs` |

To run any script in one app: `bun --cwd=apps/api run <script>` (same pattern for `console`).

## Layout

### Apps

| Path | What it is |
| --- | --- |
| `apps/api` | Bun + Hono API — RAG on pgvector, streaming tool-calling chat (AI SDK) |
| `apps/console` | Next.js 16 — admin and playground; a bare app, UI starts from zero |

### Packages

| Package | Path | Role |
| --- | --- | --- |
| `@synapse/ui` | `packages/ui` | shadcn base — the unopinionated primitives |
| `@rabtx/ui` | `packages/rabtx` | Starter component layer, not used by any app now (see [DESIGN.md](DESIGN.md)) |
| `@synapse/logger` | `packages/logger` | Shared structured logging |
| `@synapse/typescript-config` | `packages/typescript-config` | Base tsconfigs every workspace extends |

### Everything else

| Path | Purpose |
| --- | --- |
| `.agents/` | Agent rules, roles, skills and the coordination board |
| `docker/` | Compose fragments: Postgres (pgvector), API, console |
| `scripts/` | Bash utilities, plus architecture and naming checks |
| `.github/workflows/` | `ci.yml`, `cd.yml`, `security.yml` |
| `.devcontainer/` | Bun + Rust + Bash tooling |

## Commands

| Command | Does |
| --- | --- |
| `bun run dev` / `dev:api` / `dev:console` | All dev servers / one app |
| `bun run build` | Build every app |
| `bun run lint` / `lint:fix` | oxlint, plus ShellCheck over `scripts/` |
| `bun run format` | Format TS/JS and shell |
| `bun run typecheck` | TypeScript across workspaces |
| `bun run test` / `test:coverage` | Unit tests / coverage gates |
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

Console `:3000`, API `:8000`, Postgres (pgvector) on host `:5433`. More in
[docker/README.md](docker/README.md).

## Dev Container

`.devcontainer/` installs **Bun**, **Rust** and the Bash lint tools.

```text
Reopen in Container → bun run prepare → bun run dev
```

See [.devcontainer/README.md](.devcontainer/README.md).

## Docs

[PROJECT.md](PROJECT.md), [AGENTS.md](AGENTS.md), [apps/api/README.md](apps/api/README.md).

## License

Dual-licensed under **MIT** or **Apache-2.0**, at your option —
[LICENSE-MIT](LICENSE-MIT), [LICENSE-Apache-2.0](LICENSE-Apache-2.0).
