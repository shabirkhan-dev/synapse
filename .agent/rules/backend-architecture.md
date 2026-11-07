# Rule: backend architecture

Applies to `apps/api` (and `apps/worker` when it exists). Full standard with examples:
`docs/development/backend-architecture.md`.

## Layout

```text
apps/api/src/
├── app.ts · server.ts      # composition root (wires modules, middleware, error handler)
├── config/                 # env parsing + typed configs (see configuration.md)
├── shared/                 # constants/ errors/ responses/ middleware/ utils/ types/
├── infrastructure/         # database/ logger/ cache/ queue/ (until packages/adapters owns them)
├── modules/<domain>/       # one folder per domain; owns its routes … mappers
└── routes/index.ts         # mounts module routers
```

## Rules

1. **A module owns its domain end to end:** routes, controllers, services, repositories, schemas,
   types, constants, mappers. Create a folder (or `<name>.<role>.ts` file) only when it has a real
   responsibility.
2. **Request flow is one way:** route → controller → service → repository → database.
3. **Controllers** handle HTTP input/output only — no business logic.
4. **Services** hold business logic — they never import Hono or build HTTP responses. They throw
   `AppError`.
5. **Repositories** are the only code that queries the database (Drizzle). Routes and controllers
   never import repositories.
6. **Modules talk through public interfaces:** import another module only via its `index.ts`
   (`@/modules/rag`), never its internals (`@/modules/rag/services/...`). The same applies to code
   outside `modules/`.
7. **HTTP responses are built only by the shared response helpers** (`shared/responses`, today
   `common/api-response.ts`) and the central error handler.
8. **Status codes, error codes and messages come from shared constants** (`HTTP_STATUS`,
   `ERROR_CODES`, `RESPONSE_MESSAGES`); module-specific codes/messages live in the module's
   `constants/`. The message is never the machine-readable identifier.
9. **One `AppError`** with typed `code`, `message`, `statusCode` (and optional `details`). Add a
   subclass only for genuinely different behaviour.
10. **`shared/` is not a dumping ground.** Code goes there only when two or more modules use it.
11. **No layer for its own sake.** A layer must have a clear responsibility.

Enforced by `bun run architecture:check` (`scripts/architecture/check-layers.sh`), which runs in the pre-commit hook and CI. Rules 2, 4, 5, 6 and 7 are checked automatically; 1, 3, 8–11 in review.
