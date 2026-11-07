# Rule: configuration

1. **Env is read in one place per app:** `apps/api/src/config/`, `apps/console/src/config/`.
   Nowhere else may touch `process.env`, `Bun.env` or `import.meta.env`. Packages read env only
   through `@synapse/core/config` (`loadConfig`).
2. **Validate once at startup with Zod and fail fast.** Types are inferred from the schema.
3. **Separate parsing from configuration:** `config/env.ts` parses; `config/<area>.config.ts`
   exposes small typed configs (`appConfig`, `databaseConfig`, `authConfig`). Prefer small domain
   configs over one giant object.
4. **Defaults are explicit** in the schema; production rejects development defaults for secrets.
5. **Server secrets never reach the console.** Only `NEXT_PUBLIC_*` values are allowed in browser
   code, read in `apps/console/src/config/`.
6. Entry points with different needs (e.g. `migrate.ts`) get their own small schema in `config/`
   instead of reading env directly.
7. Every new variable is documented in the root `.env.example` (the one env file; compose and host
   runs read the root `.env`) **and** added to Doppler `synapse/dev` (`docs/development/secrets.md`).

Tooling files outside `src/` (e.g. `drizzle.config.ts`) and tests may read env directly.
Enforced by `bun run architecture:check` (`scripts/architecture/check-layers.sh`), which runs in the pre-commit hook and CI.
