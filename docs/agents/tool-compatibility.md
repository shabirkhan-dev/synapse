# Tool compatibility

> **Status:** Live for `AGENTS.md` · Placeholder — tool-specific links (`CLAUDE.md`, `.claude/`,
> `.cursor/`) are not set up yet.

`.agent/` is tool-neutral. How each tool finds it:

| Tool | Reads | Notes |
| --- | --- | --- |
| Codex, Copilot, Windsurf, Aider, Cline… | `AGENTS.md` | `AGENTS.md` points to `.agent/` |
| Claude Code | `CLAUDE.md`, `.claude/skills/` | Not set up. Option: a `CLAUDE.md` that imports `@AGENTS.md`, and `.claude/skills` linked to `.agent/skills` |
| Cursor | `.cursor/rules/` | Not set up. `.agent/rules/*.mdc` are Cursor-format and can be linked |

Decide and record the chosen setup in `.agent/memory/decisions.md` before adding tool folders.
