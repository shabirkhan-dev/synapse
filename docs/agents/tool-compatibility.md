# Tool compatibility

> **Status:** Live.

One source of truth — `AGENTS.md` and `.agents/` — wired so each tool finds it on its own:

| | Codex | OpenCode | Claude Code |
| --- | --- | --- | --- |
| Entry file | `AGENTS.md` | `AGENTS.md` | `CLAUDE.md` → imports `@AGENTS.md` |
| Rules (`.agents/rules/*.md`) | via links in `AGENTS.md`; the four core rules are inline there | always loaded via `opencode.json` `instructions` | always loaded via `@` imports in `CLAUDE.md` |
| Memory (`.agents/memory/*.md`) | via links in `AGENTS.md` | always loaded via `opencode.json` | always loaded via `CLAUDE.md` |
| Skills (`.agents/skills/*/SKILL.md`) | native (`.agents/skills`) | native (`.agents/skills`) | `.claude/skills` → symlink to `.agents/skills` |

Files that do the wiring:

- `AGENTS.md` — shared entry point (Codex, OpenCode, Copilot, Windsurf, Aider, Cline…).
- `CLAUDE.md` — imports `AGENTS.md`, every rule and every memory file.
- `opencode.json` — `"instructions": [".agents/rules/*.md", ".agents/memory/*.md"]`.
- `.claude/skills` — symlink to `../.agents/skills` (the rest of `.claude/` stays gitignored).

Notes:

- Tools advertise only each skill's `name` + `description` and read the body when it is relevant,
  so keep descriptions precise.
- Always-loaded rules + memory are about 23 KB (~6k tokens). Keep rules short; move explanations to
  `docs/`.
- Windows: git symlinks need `core.symlinks=true` (Developer Mode). Without it, `.claude/skills`
  checks out as a text file — copy `.agents/skills` there locally instead.
- Claude Code asks once to approve the `@` imports in `CLAUDE.md`.
- Cursor (`.cursor/rules/`) is not wired; `.agents/rules/*.mdc` are Cursor-format if it is needed.
- Add a rule, skill or memory file only under `.agents/`; never in a tool-specific folder.
