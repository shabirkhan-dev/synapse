# Memory: conventions

- Package scope: `@synapse/<name>`. Apps are unscoped (`api`, `console`).
- Files and folders: kebab-case, dotted roles allowed (`rag.service.ts`). Checked by
  `bun run naming:check`.
- Commits: Conventional Commits, all lowercase subject, 10–200 chars, no WIP
  (`feat(rag): add hybrid search`). Enforced by the `commit-msg` hook.
- Ports: console `3000`, API `8000`, Postgres on host `5433`.
- API base path `/api/v1`; docs at `/api/docs`; OpenAPI at `/api/openapi.json`.
- Env: validated with Zod at startup (`apps/api/src/config/env.ts`); examples in
  `apps/api/.env.example` and `env.docker.example`.
- Tooling: Bun only; oxlint + oxfmt (tabs, width 100); Lefthook hooks; ShellCheck + shfmt for bash.
- UI: add components with `bunx --bun shadcn@latest add <name>` from `packages/ui`; HugeIcons only.
