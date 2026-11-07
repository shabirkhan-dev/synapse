# Rules system

> **Status:** Live.

`.agent/rules/` holds short, binding rules — what must always be true. One file per area:
architecture, coding-standards, typescript, bun, rust, database, api-design, security, testing,
error-handling, documentation.

- Rules are imperative and checkable. Explanations belong in `docs/`.
- A rule changes only with human approval; architecture-level changes need an ADR.
- `.agent/rules/*.mdc` are editor rules (Cursor-style frontmatter, `alwaysApply`) kept from the
  starter; they summarise the same conventions.
