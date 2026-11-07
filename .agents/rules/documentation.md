# Rule: documentation

- Docs live in `docs/`; agent guidance lives in `.agents/`. Do not duplicate content between them —
  link instead.
- Update docs **in the same change** as the code they describe:
  - new or changed endpoint → `docs/api/endpoints.md` (and the route schema),
  - new package or boundary change → `docs/packages/<name>.md` and
    `docs/architecture/package-boundaries.md`,
  - a decision that is hard to reverse → a new ADR in `docs/decisions/adr/`,
  - a lasting fact agents should know → `.agents/memory/`.
- Each doc starts with a one-line purpose and a **Status** line (`Live`, `Planned`, or
  `Placeholder — <what is missing>`). Never present a plan as if it were built.
- Prefer short pages, tables and real commands over prose.
