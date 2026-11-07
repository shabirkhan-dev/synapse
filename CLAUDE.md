# Claude Code

Claude Code reads this file; the content is shared with every other agent through `AGENTS.md` and
`.agents/`. Skills are linked: `.claude/skills` → `.agents/skills`. Do not add Claude-only rules
here — put them in `.agents/rules/` so all tools get them.

@AGENTS.md

## Rules (always apply)

@.agents/rules/architecture.md
@.agents/rules/backend-architecture.md
@.agents/rules/frontend-architecture.md
@.agents/rules/configuration.md
@.agents/rules/coding-standards.md
@.agents/rules/typescript.md
@.agents/rules/bun.md
@.agents/rules/rust.md
@.agents/rules/database.md
@.agents/rules/api-design.md
@.agents/rules/security.md
@.agents/rules/testing.md
@.agents/rules/error-handling.md
@.agents/rules/documentation.md

## Memory (current facts)

@.agents/memory/architecture.md
@.agents/memory/decisions.md
@.agents/memory/conventions.md
@.agents/memory/known-constraints.md
