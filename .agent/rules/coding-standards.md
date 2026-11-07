# Rule: coding standards

- **Least code that solves the problem.** No speculative abstractions, no unrequested files, no
  future-proofing. (See `skills/ponytail/`.)
- **Small units.** One concern per function and file; extract when a unit grows a second job.
- **Names say what, not how.** kebab-case files and folders (dotted roles allowed:
  `rag.service.ts`, `rag.routes.ts`); PascalCase types and components; camelCase values.
- **Imports:** external → workspace (`@synapse/*`) → relative, one blank line between groups.
  No unused imports, no deep imports into another package.
- **Formatting is not a debate:** oxfmt (tabs, width 100) and oxlint. Run `bun run format` and
  `bun run lint`; the pre-commit hook runs them too.
- **No dead code.** Delete it; git remembers.
- **Comments explain why**, never what. Public functions get a one-line doc comment when the name
  is not enough.
- Keep lint/format-only changes out of feature commits.
