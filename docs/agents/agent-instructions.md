# Agent instructions

> **Status:** Live.

Load order for any agent session:

1. `AGENTS.md` (root) — overview, commands, conventions.
2. `.agents/README.md` — what lives in `.agents/` and the coordination protocol.
3. `.agents/rules/*.md` — binding rules (always).
4. `.agents/memory/*.md` — current architecture, decisions, conventions, known constraints.
5. The matching skill in `.agents/skills/<task>/SKILL.md`.
6. For coordinated work: `.agents/agent-contract.md`, one role in `.agents/roles/`, the card in
   `.agents/board/`, and `.agents/worktrees.md`.

Before finishing: `bun run lint`, `bun run typecheck`, `bun run test`, docs updated.
