# Synapse - Project overview

This document is the deeper technical reference for the Synapse monorepo.
For quick setup/use, start with `README.md`.

## What this repository includes

Monorepo managed by **Bun + Turborepo**, with:

- A Bun + Hono API and a bare Next.js console
- Shared workspace packages (`@synapse/*`)
- Bash scripts and quality tooling
- Architecture boundary checks
- Git hooks and CI/CD/security pipelines
- Optional Docker and Dev Container workflows

## Repository layout

```text
synapse/
├── apps/                     # Runnable applications
│   ├── api/                  # Bun + Hono API (RAG on pgvector, streaming chat)
│   ├── worker/               # Background jobs (pg-boss): re-embedding, pruning
│   └── console/              # Next.js console (bare, UI starts from zero)
├── packages/
│   ├── adapters/             # @synapse/adapters: model gateway
│   ├── ingestion/            # @synapse/ingestion: normalize, dedup, pipeline
│   ├── knowledge/            # @synapse/knowledge: chunking, embeddings, versions
│   ├── retrieval/            # @synapse/retrieval: vector, keyword, hybrid
│   ├── generation/           # @synapse/generation: prompts, context, citations, provenance
│   ├── observability/        # @synapse/observability: logs, tracing, LLM usage/cost
│   ├── evaluation/           # @synapse/evaluation: retrieval evals, baselines
│   ├── orchestration/        # @synapse/orchestration: LangGraph graphs, checkpoints
│   ├── security/             # @synapse/security: passwords, access + refresh tokens
│   ├── core/                 # @synapse/core: errors, config, shared types, contracts
│   ├── database/             # @synapse/database: Drizzle client, schema, migrations
│   ├── typescript-config/    # Shared TS config bases
│   └── ui/                   # shadcn/ui on Base UI + HugeIcons + Tailwind v4
├── scripts/                  # Bash scripts, architecture checks and tests
├── docker/                   # Docker Compose fragments
├── .github/workflows/        # CI/CD/security workflows
├── .devcontainer/            # Reproducible development environment
├── .oxlintrc.json            # Linter config (TS/JS)
├── .oxfmtrc.json             # Formatter config (TS/JS)
├── lefthook.yml              # Git hooks
├── turbo.json                # Turborepo pipeline
├── package.json              # Root scripts + workspaces
├── docs/                     # Architecture, packages, ADRs, development, API, runbooks, guides
├── .agents/                   # Agent rules, skills, memory, roles, board
└── AGENTS.md                 # Universal AI agent guidance
```

## Apps and stacks

| App | Stack | Notes |
| --- | --- | --- |
| `apps/api` | Bun, Hono, @hono/zod-openapi, AI SDK, Drizzle + pgvector, bun test | RAG + streaming tool chat; verifies HS256 access tokens |
| `apps/worker` | Bun, pg-boss (via `@synapse/adapters/queue`), Drizzle | Background jobs: re-embedding (checkpointed), daily pruning |
| `apps/console` | Next.js 16, React 19 | Bare App Router app; no UI library yet |

## Shared packages

| Package | Workspace import | Purpose |
| --- | --- | --- |
| `packages/adapters` | `@synapse/adapters` | Model gateway implementing the core contract |
| `packages/ingestion` | `@synapse/ingestion` | Normalization, dedup, ingestion pipeline |
| `packages/knowledge` | `@synapse/knowledge` | Chunking, embeddings, chunk versions |
| `packages/retrieval` | `@synapse/retrieval` | Vector, keyword, hybrid retrieval |
| `packages/generation` | `@synapse/generation` | Prompts, context, citations, provenance |
| `packages/observability` | `@synapse/observability` | Logs, tracing, LLM usage/cost |
| `packages/evaluation` | `@synapse/evaluation` | Retrieval evals, baselines, CI regression |
| `packages/orchestration` | `@synapse/orchestration` | LangGraph graphs with Postgres checkpoints |
| `packages/security` | `@synapse/security` | Authentication: passwords, access tokens, refresh tokens |
| `packages/core` | `@synapse/core` | Errors, config loading, shared types, contracts |
| `packages/database` | `@synapse/database` | Drizzle client, schema, migrations, runner |
| `packages/ui` | `@synapse/ui` | shadcn/ui on Base UI (style `base-mira`), HugeIcons, Tailwind v4 |
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
| `bun run architecture:check` | Enforce architecture boundaries + kebab-case naming |
| `bun run preflight` | Lint + typecheck + test |
| `bun run prepare` | Install git hooks (Lefthook) |

### Running one app directly

```bash
bun --cwd <app-path> run <script>
```

Examples:

- `bun --cwd=apps/api run dev` (or `bun run dev:api`)
- `bun --cwd=apps/console run dev` (or `bun run dev:console`)
- `bun --cwd=apps/worker run dev` (or `bun run dev:worker`)

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

- **CI:** `.github/workflows/ci.yml` runs lint/typecheck/build/test and the API pgvector job
- **CD:** `.github/workflows/cd.yml` is a staged deploy template (`main` and version tags)
- **Security:** `.github/workflows/security.yml` + Dependabot + CodeQL

## Docker workflow

Postgres (pgvector), the API, and the Next.js console are composed through root `docker-compose.yml` with
fragment files under `docker/compose/` (Compose Spec — no top-level `version` key).

```bash
cp .env.example .env
docker compose up -d --build
```

Defaults: console `3000`, API `8000`, Postgres host `5433`. More details: `docker/README.md`.

## Dev Container workflow

`.devcontainer/` provides a reproducible setup with Bun, Rust, and the Bash lint/format tools.

- Open in VS Code/Cursor and choose **Reopen in Container**
- See `.devcontainer/README.md` for exact toolchain and post-create steps

## Conventions and development rules

- Primary repository guidance: `AGENTS.md`
- Agent rules, skills and memory: `.agents/` (see `docs/agents/`)
- Use workspace imports as `@synapse/<package>`

## Related docs

- `docs/README.md` - full documentation index
- `README.md` - quick start and high-level navigation
- `scripts/README.md` - script usage and structure
- `apps/*/README.md` - per-app setup and workflows
