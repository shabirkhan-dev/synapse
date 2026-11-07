# Package development

> **Status:** Live guidance; first platform package (`core`) not created yet.

## Create a package

```text
packages/<name>/
├── package.json     # "name": "@synapse/<name>", "private": true, "type": "module"
├── tsconfig.json    # extends @synapse/typescript-config/base.json
├── README.md
└── src/
    ├── index.ts     # the only public entry point
    └── <module>/    # internal modules from the plan
```

`package.json` scripts: `lint` (`oxlint`), `lint:fix`, `typecheck` (`tsc --noEmit`), `test`
(`bun test`). Use `"workspace:*"` for workspace dependencies, then run `bun install`.

## Checklist

1. The capability has no other owner (`docs/architecture/package-boundaries.md`).
2. Dependencies follow `docs/architecture/dependency-architecture.md`.
3. `docs/packages/<name>.md` written or updated.
4. `bun run lint && bun run typecheck && bun run test && bun run architecture:check` pass.

Agent version: `.agent/skills/package-development/SKILL.md`.
