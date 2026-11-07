# Rule: Bun

- Bun is the only package manager and runtime (`bun@1.4.4`). Never use npm, yarn or pnpm.
- Install with `bun install`; CI uses `bun install --frozen-lockfile`. Commit `bun.lock`.
- Run tasks from the root through Turborepo: `bun run dev|build|lint|typecheck|test`.
  Target one workspace with `bun --cwd=<path> run <script>` or `bunx turbo run <task> --filter=<name>`.
- Tests in Bun workspaces use `bun test` (`apps/api`). Mock network and LLM calls.
- Workspace dependencies use `"workspace:*"`.
- Add a dependency to the package that uses it, not to the root.
