# Repository structure

> **Status:** Live for what exists; planned folders are marked.

```text
synapse/
├── AGENTS.md            # entry point for AI agents
├── .agents/              # agent rules, skills, memory, roles, board
├── apps/
│   ├── api/             # Hono HTTP API (live)
│   ├── console/         # Next.js admin + playground (live, bare)
│   └── worker/          # jobs + cron (planned)
├── packages/
│   ├── ui/              # @synapse/ui (live)
│   ├── typescript-config/ (live)
│   ├── core/            # @synapse/core (live: errors, config, types)
│   ├── database/        # @synapse/database (live: client, schema, migrations)
│   ├── adapters/        # @synapse/adapters (live: model gateway)
│   ├── ingestion/       # @synapse/ingestion (live: normalize, dedup, pipeline)
│   ├── knowledge/       # @synapse/knowledge (live: chunking, embeddings, versions)
│   ├── retrieval/       # @synapse/retrieval (live: vector, keyword, hybrid)
│   ├── generation/      # @synapse/generation (live: prompts, context, citations, provenance)
│   └── ingestion, knowledge, … (planned — see docs/packages)
├── crates/              # Rust via napi-rs (planned)
├── deploy/              # docker, compose, migrations, backups, monitoring (planned)
├── docker/              # current compose fragments (live)
├── tests/               # cross-package e2e/load/chaos/security/eval (planned)
├── docs/                # this documentation
├── scripts/             # bash utilities, architecture + naming checks, git hooks
└── .github/workflows/   # ci.yml, cd.yml, security.yml
```

Root config: `package.json`, `bun.lock`, `turbo.json`, `tsconfig.json`, `.oxlintrc.json`,
`.oxfmtrc.json`, `lefthook.yml`, `docker-compose.yml`, `env.docker.example`.
