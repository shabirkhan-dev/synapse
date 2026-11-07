# Rules system

> **Status:** Live.

`.agents/rules/` holds short, binding rules — what must always be true. One file per area:
architecture, backend-architecture, frontend-architecture, configuration, coding-standards,
typescript, bun, rust, database, api-design, security, testing, error-handling, documentation,
progress-tracking (board cards, roadmap, and the Roadmap block at the end of every reply).

Rules that can be checked mechanically are enforced by `bun run architecture:check`
(`scripts/architecture/check-layers.sh`, `check-boundaries.sh`, `check-naming.sh`).

- Rules are imperative and checkable. Explanations belong in `docs/`.
- A rule changes only with human approval; architecture-level changes need an ADR.
- `.agents/rules/*.mdc` are editor rules (Cursor-style frontmatter, `alwaysApply`) kept from the
  starter; they summarise the same conventions.
