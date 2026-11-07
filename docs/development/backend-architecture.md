# Backend architecture

> **Status:** Live standard. `apps/api` is partly migrated: modules have public `index.ts` files
> and pass `bun run architecture:check`; the move to `shared/`, `infrastructure/`, per-layer
> folders and `HTTP_STATUS` / `ERROR_CODES` / `RESPONSE_MESSAGES` constants is the next step.

Agent rules: `.agent/rules/backend-architecture.md`, `.agent/rules/configuration.md`.
Playbook: `.agent/skills/backend-module-development/`.

## Principles

- Centralize genuinely shared code; keep business logic inside its owning module.
- Every layer has one clear responsibility. No layer exists just to follow a diagram.
- `shared/` holds only code with a real cross-module use.
- Modules talk through their public interface, never each other's internals.

## Layout

```text
apps/api/src/
├── app.ts                 # builds the Hono app: middleware, routes, error handler
├── server.ts              # starts the server (today: index.ts)
├── config/
│   ├── env.ts             # Zod schema, parsed once
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── auth.config.ts
│   └── index.ts
├── shared/
│   ├── constants/         # http-status.ts, error-codes.ts, response-messages.ts
│   ├── errors/            # app-error.ts, error-handler.ts
│   ├── responses/         # success-response.ts, error-response.ts, response.types.ts
│   ├── middleware/ · utils/ · types/
├── infrastructure/        # database/ logger/ cache/ queue/ (until packages/adapters owns them)
├── modules/
│   ├── users/ · organizations/ · documents/ · knowledge/ · ingestion/
└── routes/index.ts        # mounts every module router
```

### Module layout

```text
modules/users/
├── routes/user.routes.ts
├── controllers/user.controller.ts
├── services/user.service.ts
├── repositories/user.repository.ts
├── schemas/create-user.schema.ts, update-user.schema.ts
├── types/user.types.ts
├── constants/user.constants.ts
├── mappers/user.mapper.ts
├── user.module.ts         # composes the module
└── index.ts               # public interface
```

Not every module needs every folder. A small module can stay flat (`user.routes.ts`,
`user.service.ts`, …) and grow folders when a layer has more than one file.

| Layer | Responsibility |
| --- | --- |
| Routes | HTTP endpoints, middleware, OpenAPI schemas |
| Controllers | HTTP input and output |
| Services | Business logic and coordination |
| Repositories | Database queries and persistence |
| Schemas | Input validation and contracts |
| Types | Module-specific TypeScript types |
| Constants | Module-specific values, codes, messages |
| Mappers | Convert database / domain / API shapes |
| Module | Compose and expose the module |

**Request flow:** route → controller → service → repository → database. Controllers never hold
business logic; services never construct HTTP responses.

## Configuration

All env is read and validated in `config/`. Nothing else touches `process.env` / `Bun.env`.

```ts
// config/env.ts
import { loadConfig } from "@synapse/core/config";
import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().default(8000),
	DATABASE_URL: z.url(),
	JWT_SECRET: z.string().min(32),
});

export const env = loadConfig(envSchema); // validates once, throws CONFIG_INVALID
export type Environment = z.infer<typeof envSchema>;
```

```ts
// config/database.config.ts
import { env } from "./env";

export const databaseConfig = { url: env.DATABASE_URL } as const;
```

Rules: validate once at startup, fail fast, explicit defaults, parsing separate from configuration,
small domain configs over one giant object, server secrets never reach the console.

## Status codes, error codes, messages

```ts
// shared/constants/http-status.ts
export const HTTP_STATUS = {
	OK: 200, CREATED: 201, ACCEPTED: 202, NO_CONTENT: 204,
	BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422, TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500, SERVICE_UNAVAILABLE: 503,
} as const;

// shared/constants/error-codes.ts
export const ERROR_CODES = {
	VALIDATION_ERROR: "VALIDATION_ERROR",
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
	INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

// shared/constants/response-messages.ts
export const RESPONSE_MESSAGES = {
	SUCCESS: { CREATED: "Resource created successfully.", FETCHED: "Resource retrieved successfully." },
	ERRORS: { UNAUTHORIZED: "Authentication required.", NOT_FOUND: "Requested resource was not found." },
} as const;
```

- **HTTP status** = protocol outcome. **Error code** = machine-readable application error.
  **Message** = text for the consumer. Never use the message as the identifier.
- Add module-specific codes and messages in the module's `constants/` when the distinction matters
  (today: `AUTH_ACCESS_TOKEN_MISSING`, `RAG_DOCUMENT_NOT_FOUND`, `CHAT_INVALID_MESSAGES`, …).

## Errors and responses

One `AppError` with typed properties; a service throws it, the central error handler turns it into
the response:

```ts
throw new AppError({
	statusCode: HTTP_STATUS.NOT_FOUND,
	code: ERROR_CODES.RESOURCE_NOT_FOUND,
	message: RESPONSE_MESSAGES.ERRORS.NOT_FOUND,
});
```

Responses are built only by the shared helpers (`success(...)`, `failure(...)`) and the error
handler, so every endpoint returns the same envelope. Current envelope: `docs/api/conventions.md`.

> Open decision: the proposal adds a `message` field to success responses and nests the error code
> as `error: { code }`. That is a breaking change for API clients; decide it in the `shared/`
> migration step.

Add a specialised error class only when it behaves differently (e.g. carries retry data).

## Database conventions

| Area | Convention |
| --- | --- |
| Tables | snake_case, plural (`documents`, `ingestion_jobs`, `organization_members`) |
| Columns | snake_case |
| Primary keys | `id` |
| Foreign keys | `{entity}_id` |
| Timestamps | `created_at`, `updated_at` |
| Booleans | `is_active`, `is_deleted` |
| Indexes | explicitly named |
| Migrations | generated, reviewed, version-controlled |
| Transactions | explicit boundaries for atomic operations |
| Queries | parameterized and typed (Drizzle) |

- PostgreSQL is the source of truth; Drizzle for schema and queries.
- Tenant scope is explicit in the repository contract:
  `documentRepository.findById({ documentId, tenantId })`. Never assume a client-supplied id
  belongs to the current tenant.
- Index from query patterns; no unbounded collections; soft delete only when product or compliance
  requires it; pgvector index settings match the measured workload.
- Target home for database code: `packages/adapters/database/` (`client/`, `schema/`,
  `migrations/`, `transactions/`, `types/`). Today: `apps/api/src/database/`.

## Enforcement

`bun run architecture:check` runs `scripts/architecture/check-layers.sh` (pre-commit and CI):

| Check | Fails when |
| --- | --- |
| Env | `process.env` / `Bun.env` / `import.meta.env` used in `apps/api/src` outside `config/` |
| Module isolation | a file imports another module's internals instead of its `index.ts` |
| Service purity | a `*.service.ts` / `*.repository.ts` imports Hono or the response helpers |
| Route → service | a route or controller imports a repository |
| Responses | `c.json` / `c.body` / `new Response` outside `common/` (`shared/responses`, `shared/errors`) |
| Data access | `drizzle-orm` / `postgres` imported outside repositories and `database/` |

`scripts/bash/tests/check-layers.test.sh` proves each check fires on a fixture repo.
