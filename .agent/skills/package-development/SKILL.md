---
name: package-development
description: Use when creating a new workspace package under packages/ or changing a package's public API or dependencies.
---

# package-development

> Status: Live guidance. No domain packages exist yet; follow this when creating the first (`core`).

## When to use

Creating a package from the plan (`core`, `adapters`, `ingestion`, …), adding an internal module, or changing what a package exports or depends on.

## Workflow

1. Check `docs/architecture/package-boundaries.md`: the capability must have exactly one owner.
2. Create `packages/<name>/` with `package.json` (`"name": "@synapse/<name>"`, `"private": true`, `"type": "module"`, scripts `lint`, `lint:fix`, `typecheck`, `test`), `tsconfig.json` extending `@synapse/typescript-config/base.json`, `src/index.ts` and a `README.md`.
3. Put internal modules in `src/<module>/` (e.g. `src/chunking/`); export only what other packages need from `src/index.ts` (or explicit `exports` subpaths).
4. Depend only on packages allowed by `docs/architecture/dependency-architecture.md`. Vendor SDKs only in `adapters`/`providers`.
5. Add `packages/<name>/src` to `scripts/architecture/check-naming.sh` scopes if it should be name-checked.
6. Write `docs/packages/<name>.md` (purpose, owns, does not own, public API, dependencies, status).
7. Run `bun install` so the workspace links, then the checks below.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agent/rules/documentation.md`
- `bun run architecture:check` passes
- No app or package imports the new package's internals

## References

- `.agent/rules/architecture.md`
- `docs/development/package-development.md`
- `docs/packages/README.md`
