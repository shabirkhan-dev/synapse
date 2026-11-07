# Coding standards

> **Status:** Live.

The binding rules are in `.agents/rules/` — this page is the human summary.

- Least code that solves the problem; no speculative abstraction.
- TypeScript `strict`, no `any`, Zod at the edges, types inferred from schemas.
- kebab-case files (dotted roles OK: `rag.service.ts`), PascalCase types, camelCase values.
- Imports: external → `@synapse/*` → relative.
- oxfmt (tabs, width 100) and oxlint: `bun run format`, `bun run lint`.
- Typed errors with stable codes; no silent catches.
- Domain packages never import vendor SDKs.

See: [typescript](../../.agents/rules/typescript.md), [coding standards](../../.agents/rules/coding-standards.md),
[error handling](../../.agents/rules/error-handling.md), [architecture](../../.agents/rules/architecture.md).

App structure: [backend architecture](backend-architecture.md), [frontend architecture](frontend-architecture.md).
