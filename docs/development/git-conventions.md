# Git conventions

> **Status:** Live.

- **Commits:** Conventional Commits — `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`,
  optional scope, **all lowercase** subject, 10–200 characters, no WIP.
  Example: `feat(retrieval): add hybrid search`.
- **Hooks (Lefthook, installed by `bun install`):**
  - pre-commit: trailing whitespace, format, lint:fix, typecheck, architecture check, large-file
    guard (2 MB), secret scan
  - commit-msg: the rules above
- **Branches:** short-lived feature branches off `main`; agents use `agent/<role>/<card-slug>`
  worktrees (`.agent/worktrees.md`).
- Keep formatting-only changes in their own commit.
