# Agent instructions

> **Status:** Live.

Load order for any agent session:

1. `AGENTS.md` (root) — overview, commands, conventions.
2. `.agent/README.md` — what lives in `.agent/` and the coordination protocol.
3. `.agent/rules/*.md` — binding rules (always).
4. `.agent/memory/*.md` — current architecture, decisions, conventions, known constraints.
5. The matching skill in `.agent/skills/<task>/SKILL.md`.
6. For coordinated work: `.agent/agent-contract.md`, one role in `.agent/roles/`, the card in
   `.agent/board/`, and `.agent/worktrees.md`.

Before finishing: `bun run lint`, `bun run typecheck`, `bun run test`, docs updated.
