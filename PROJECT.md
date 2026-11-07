# Synapse - Project overview

This document is the deeper technical reference for the Synapse monorepo.
For quick setup/use, start with `README.md`.

## What this repository includes

Monorepo managed by **Bun + Turborepo**, with:

- A Bun + Hono AI API and a Next.js web app
- Shared workspace packages (`@synapse/*`, plus `@rabtx/ui`)
- Bash scripts and quality tooling
- Architecture boundary checks
- Git hooks and CI/CD/security pipelines
- Optional Docker and Dev Container workflows

## Repository layout

```text
synapse/
├── apps/                     # Runnable applications
│   ├── ai-api/               # Bun + Hono AI API (RAG on pgvector, streaming chat)
│   └── web/                  # Next.js app
├── packages/
│   ├── logger/               # Shared logger (TypeScript + Rust)
│   ├── rabtx/                # @rabtx/ui component layer used by the web app
│   ├── typescript-config/    # Shared TS config bases
│   └── ui/                   # Shared web UI primitives + design tokens
├── scripts/                  # Bash scripts, architecture checks and tests
├── docker/                   # Docker Compose fragments
├── .github/workflows/        # CI/CD/security workflows
├── .devcontainer/            # Reproducible development environment
├── .oxlintrc.json            # Linter config (TS/JS)
├── .oxfmtrc.json             # Formatter config (TS/JS)
├── lefthook.yml              # Git hooks
├── turbo.json                # Turborepo pipeline
├── package.json              # Root scripts + workspaces
└── AGENTS.md                 # Universal AI agent guidance
```

## Apps and stacks

| App | Stack | Notes |
| --- | --- | --- |
| `apps/ai-api` | Bun, Hono, @hono/zod-openapi, AI SDK, Drizzle + pgvector, bun test | RAG + streaming tool chat; verifies HS256 access tokens |
| `apps/web` | Next.js 16, React 19, Tailwind 4 | Includes unit/integration and Playwright e2e flow |

## Shared packages

| Package | Workspace import | Purpose |
| --- | --- | --- |
| `packages/ui` | `@synapse/ui` | Shared web UI primitives + design tokens |
| `packages/rabtx` | `@rabtx/ui` | Polished component layer used by the web app |
| `packages/logger` | `@synapse/logger` | Shared structured logger for TypeScript and Rust |
| `packages/typescript-config` | `@synapse/typescript-config` | Reusable TypeScript config presets |

## Root command surface

Run commands from repo root:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start `dev` tasks via Turborepo |
| `bun run build` | Build workspace targets |
| `bun run start` | Start runtime targets |
| `bun run lint` | Lint workspace + scripts |
| `bun run lint:fix` | Apply lint autofixes |
| `bun run format` | Format TS/JS + shell |
| `bun run typecheck` | TypeScript type checking |
| `bun run test` | Run tests in workspace + scripts |
| `bun run test:coverage` | Run full coverage-oriented pass |
| `bun run test:e2e:web` | Web Playwright e2e |
| `bun run architecture:check` | Enforce architecture boundaries + kebab-case naming |
| `bun run preflight` | Lint + typecheck + test |
| `bun run prepare` | Install git hooks (Lefthook) |

### Running one app directly

```bash
bun --cwd <app-path> run <script>
```

Examples:

- `bun --cwd=apps/ai-api run dev` (or `bun run dev:ai`)
- `bun --cwd=apps/web run dev`

## Tooling and quality system

### Monorepo and package management

- **Bun** is the only package manager (`bun@1.4.4`)
- Workspaces: `apps/*` and `packages/*`
- **Turborepo** orchestrates shared tasks (`turbo.json`)

### Linting and formatting

- **oxlint** lints and **oxfmt** formats TS/JS (`.oxlintrc.json`, `.oxfmtrc.json`)
- Formatting style: tabs, line width 100
- Root `format` and `lint` scripts also run the shell tools

### Language-specific tools

- **Bash:** `shellcheck`, `shfmt`

### Git hooks

Configured in `lefthook.yml`:

- Pre-commit: trailing whitespace fix, format, lint:fix, typecheck, architecture check
- Safety checks: large file guard, secret scan
- Commit-msg hook: message quality rules

Install hooks with:

```bash
bun run prepare
```

### Architecture enforcement

- Rule checks run via `bun run architecture:check`
- Script location: `scripts/architecture/check-boundaries.sh`

## CI/CD and security

- **CI:** `.github/workflows/ci.yml` runs lint/typecheck/build/test, the ai-api pgvector job, and web e2e
- **CD:** `.github/workflows/cd.yml` is a staged deploy template (`main` and version tags)
- **Security:** `.github/workflows/security.yml` + Dependabot + CodeQL

## Docker workflow

Postgres (pgvector), the AI API, and Next.js are composed through root `docker-compose.yml` with
fragment files under `docker/compose/` (Compose Spec — no top-level `version` key).

```bash
cp env.docker.example .env
docker compose up -d --build
```

Defaults: web `3000`, AI API `8000`, Postgres host `5433`. More details: `docker/README.md`.

## Dev Container workflow

`.devcontainer/` provides a reproducible setup with Bun, Rust, and the Bash lint/format tools.

- Open in VS Code/Cursor and choose **Reopen in Container**
- See `.devcontainer/README.md` for exact toolchain and post-create steps

## Conventions and development rules

- Primary repository guidance: `AGENTS.md`
- Cursor-specific rules: `.agents/rules/`
- Use workspace imports as `@synapse/<package>`

## Related docs

- `README.md` - quick start and high-level navigation
- `scripts/README.md` - script usage and structure
- `apps/*/README.md` - per-app setup and workflows
