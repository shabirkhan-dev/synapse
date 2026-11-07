# Backend architecture

> **Status:** Live. `apps/api` follows this standard; reference module: `apps/api/src/modules/rag/`.

Agent rules: `.agents/rules/backend-architecture.md`, `.agents/rules/configuration.md`.
Playbook: `.agents/skills/backend-module-development/`.

## Principles

- Centralize genuinely shared code; keep business logic inside its owning module.
- Every layer has one clear responsibility. No layer exists just to follow a diagram.
- `shared/` holds only code with a real cross-module use.
- Modules talk through their public interface, never each other's internals.

## Layout

```text
apps/api/src/
├── app.ts                 # builds the Hono app: middleware, docs, error handler
├── server.ts              # loads config, wires services, starts Bun.serve
├── migrate.ts             # migration entry for the built image
├── config/
│   ├── env.ts             # Zod schema, parsed once
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── auth.config.ts
│   ├── ai.config.ts · rag.config.ts · migration.config.ts
│   └── index.ts           # loadConfiguration() → { app, auth, database, ai, rag }
├── shared/
│   ├── constants/         # http-status.ts, error-codes.ts, response-messages.ts
│   ├── errors/            # app-error.ts, error-handler.ts
│   ├── responses/         # success-response.ts, error-response.ts, response.types.ts
│   ├── middleware/ · utils/ · types/
├── infrastructure/        # cache/ queue/ (later). Logs/tracing: @synapse/observability; models: @synapse/adapters; db: @synapse/database
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

Not every module needs every folder — create a folder only when the module has that
responsibility. Today the API's route handlers are trivial (validate → service → `success`), so
modules have no `controllers/` yet; add one when a handler grows real HTTP logic.

| Module | Folders today |
| --- | --- |
| `auth` | `constants/ middleware/ services/` |
| `chat` | `constants/ routes/ schemas/ services/ tools/` |
| `health` | `constants/ routes/ schemas/` |
| `rag` | `constants/ mappers/ repositories/ routes/ schemas/ services/ types/` |

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
// config/env.ts — parse once
export function parseEnv(source: ConfigSource = process.env): Env {
	return loadConfig(envSchema, source); // @synapse/core: throws CONFIG_INVALID listing every bad key
}

// config/database.config.ts — small typed domain config
export function createDatabaseConfig(env: Env): DatabaseConfig {
	return { url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX };
}

// config/index.ts — what server.ts calls
export function loadConfiguration(source?: ConfigSource): Configuration {
	return createConfiguration(parseEnv(source)); // { app, auth, database, ai, rag }
}
```

`server.ts` loads the configuration once and passes the typed pieces to the services and
`createApp`, so tests can build an app from any config (`loadConfiguration({ ... })`).

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
	BAD_REQUEST: "BAD_REQUEST",
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	NOT_FOUND: "NOT_FOUND",
	PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
	HTTP_ERROR: "HTTP_ERROR",
	INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

// shared/constants/response-messages.ts
export const RESPONSE_MESSAGES = {
	ERRORS: {
		VALIDATION_FAILED: "Request validation failed",
		REQUEST_FAILED: "Request failed",
		INTERNAL: "Internal server error",
		ROUTE_NOT_FOUND: (method: string, path: string) => `Route ${method} ${path} not found`,
	},
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
	code: RAG_ERROR_CODES.DOCUMENT_NOT_FOUND, // module constants
	message: RAG_MESSAGES.DOCUMENT_NOT_FOUND,
});
```

OpenAPI `responses` maps (`200: { … }`) keep literal status keys: they are the spec's keys, and
computed keys break Hono's response typing.

Responses are built only by the shared helpers (`success(...)`, `failure(...)`) and the error
handler, so every endpoint returns the same envelope (full spec: `docs/api/conventions.md`):

```ts
// success(c, document, RAG_MESSAGES.DOCUMENT_INGESTED, HTTP_STATUS.CREATED)
{ success: true, statusCode: 201, message: "Document ingested", data: { id: "…" }, requestId, timestamp }

// throw new AppError({ statusCode: HTTP_STATUS.NOT_FOUND, code: RAG_ERROR_CODES.DOCUMENT_NOT_FOUND, … })
{ success: false, statusCode: 404, message: "Document not found",
  error: { code: "RAG_DOCUMENT_NOT_FOUND" }, requestId, timestamp, path, method }
```

Every `success(...)` call passes a message constant; the check fails on inline message strings.

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
- Database code lives in [`@synapse/database`](../packages/database.md) (`packages/database`):
  `src/client/`, `src/schema/`, `src/migrations/` (runner), `migrations/` (SQL). Add
  `transactions/` and `types/` when there is real code for them. Repositories stay in the module.

## Enforcement

`bun run architecture:check` runs `scripts/architecture/check-layers.sh` (pre-commit and CI):

| Check | Fails when |
| --- | --- |
| Env | `process.env` / `Bun.env` / `import.meta.env` used in `apps/api/src` outside `config/` |
| Module isolation | a file imports another module's internals instead of its `index.ts` |
| Service purity | a `*.service.ts` / `*.repository.ts` imports Hono or the response helpers |
| Route → service | a route or controller imports a repository |
| Responses | `c.json` / `c.body` / `new Response` outside `shared/responses` / `shared/errors` |
| Data access | `drizzle-orm` / `postgres` imported outside repositories |
| Status constants | `statusCode: 404`, `failure(c, 404, …)` or `success(c, x, 201)` outside `constants/` |
| Error-code constants | a `"SCREAMING_SNAKE"` string literal outside `constants/` and `config/` |
| Vendor SDKs | a domain package imports `ai`, `@ai-sdk/*`, `drizzle-orm`, `postgres`, `openai`…; `core` imports `@synapse/*`; an app imports `@ai-sdk/*` |
| Message constants | `message: "…"` or a string literal in a `success(c, …)` / `failure(c, …)` call outside `constants/` |

`scripts/bash/tests/check-layers.test.sh` proves each check fires on a fixture repo.
