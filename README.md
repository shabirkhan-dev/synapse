# Starter

A production-ready monorepo starter kit for modern SaaS applications, built on **Bun workspaces + Turborepo**.

Five apps — Next.js web, Expo mobile, NestJS API, Fumadocs docs and an optional Rust demo —
sharing one UI layer, one logger, one TypeScript config, one CI pipeline and a slim
Dev Container.

Dual-licensed **MIT OR Apache-2.0**.

## Quick start

**Prerequisites**

- [Bun](https://bun.sh) `1.4.4` (pinned via `packageManager`)
- Optional: Docker Compose `v2.20+`, Rust toolchain (`apps/rust`)

```bash
git clone https://github.com/rabtx/starter.git
cd starter
bun install
bun run prepare
bun run dev
```

`bun run dev` starts every workspace except Rust (the AI API included). Add Rust with
`bun run dev:rust`, run only the AI API with `bun run dev:ai`, or run the lot with `bun run dev:all`.

| App | Dev URL |
| --- | --- |
| Web | http://localhost:3000 |
| Nest API | http://localhost:4000 — `/api/v1/health`, `/api/docs` |
| AI API | http://localhost:8000 — `/api/v1/health`, `/api/docs` |
| Docs | http://localhost:3002/docs |

To work on one app in isolation: `bun --cwd=apps/web run dev` (same pattern for `mobile`,
`nest-api`, `ai-api`, `docs`, `rust`).

## Layout

### Apps

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 16 — admin, marketing, auth and billing; component playground at `/ui` |
| `apps/mobile` | Expo SDK 58 — auth, billing via hosted checkout |
| `apps/nest-api` | NestJS API spine, Drizzle over Postgres/Neon |
| `apps/ai-api` | Bun + Hono AI API — RAG on pgvector, streaming tool-calling chat (AI SDK) |
| `apps/docs` | Fumadocs site — project docs at `/docs` |
| `apps/rust` | Optional Rust/Axum demo |

### Packages

| Package | Path | Role |
| --- | --- | --- |
| `@starter/ui` | `packages/ui` | shadcn base — the unopinionated primitives |
| `@rabtx/ui` | `packages/rabtx` | The component library, rebuilt from scratch for web and native |
| `@starter/logger` | `packages/logger` | Shared structured logging |
| `@starter/typescript-config` | `packages/typescript-config` | Base tsconfigs every workspace extends |

`@rabtx/ui` is being rebuilt one component at a time: CSS-only motion, no animation library,
HugeIcons, Flat and Floating depth. The design rules live in [DESIGN.md](DESIGN.md). Components are
shown in the playground at `/ui` in `apps/web`.

### Everything else

| Path | Purpose |
| --- | --- |
| `.agents/` | Agent rules, skills and plans — the single source; there is no second copy |
| `docker/` | Compose fragments: Postgres, Nest, web, optional profiles |
| `scripts/` | Bash utilities, plus architecture and naming checks |
| `.github/workflows/` | `ci.yml`, `cd.yml`, `security.yml` |
| `.devcontainer/` | Bun + Rust + Bash tooling |

## Commands

| Command | Does |
| --- | --- |
| `bun run dev` | All dev servers except Rust |
| `bun run dev:all` / `dev:rust` / `dev:ai` | Everything / Rust only / AI API only |
| `bun run build` | Build every app |
| `bun run lint` / `lint:fix` | oxlint, plus ShellCheck over `scripts/` |
| `bun run format` | Format TS/JS, shell and Rust |
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
- Bash: ShellCheck + shfmt · Rust: rustfmt + clippy

## Docker

```bash
cp env.docker.example .env
docker compose up -d --build
```

Web `:3000`, Nest `:4000`, AI API `:8000`, Postgres (pgvector) on host `:5433`. Optional Rust profile:
`docker compose --profile rust up -d --build`.

More in [docker/README.md](docker/README.md) and `/docs/docker`.

## Deploy

| Piece | Host | Config |
| --- | --- | --- |
| Web + docs | [Vercel](https://vercel.com) | `apps/*/vercel.json` |
| Nest API + AI API | [Render](https://render.com) | `render.yaml` |
| Database | [Neon](https://neon.tech) | `DATABASE_URL` |

Walkthrough: `/docs/deploy` — [apps/docs/content/docs/deploy.mdx](apps/docs/content/docs/deploy.mdx).

## Dev Container

`.devcontainer/` installs **Bun**, **Rust** and the Bash lint tools. C and Lua are
deliberately excluded.

```text
Reopen in Container → bun run prepare → bun run dev
```

See [.devcontainer/README.md](.devcontainer/README.md).

## Docs

```bash
bun --cwd=apps/docs run dev
```

- [/docs/quick-start](http://localhost:3002/docs/quick-start)
- [/docs/architecture](http://localhost:3002/docs/architecture)
- [/docs/deploy](http://localhost:3002/docs/deploy)
- [/docs/docker](http://localhost:3002/docs/docker)
- [/docs/production-roadmap](http://localhost:3002/docs/production-roadmap)
- [/ui](http://localhost:3000/ui) — `@rabtx/ui` playground (in `apps/web`)

Also in the repo: [PROJECT.md](PROJECT.md), [DESIGN.md](DESIGN.md), [AGENTS.md](AGENTS.md),
[CHANGELOG.md](CHANGELOG.md).

## License

Dual-licensed under **MIT** or **Apache-2.0**, at your option —
[LICENSE-MIT](LICENSE-MIT), [LICENSE-Apache-2.0](LICENSE-Apache-2.0).
