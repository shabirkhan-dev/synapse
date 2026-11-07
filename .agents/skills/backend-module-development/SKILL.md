---
name: backend-module-development
description: Use when creating or changing a backend domain module in apps/api (routes, controllers, services, repositories, schemas, types, constants, mappers), or touching config, shared errors and responses.
---

# backend-module-development

> Status: Live. `apps/api` follows this layout (`config/`, `shared/`, `infrastructure/`, `routes/`,
> per-layer module folders). Reference module: `apps/api/src/modules/rag/`.

## When to use

Adding a domain (users, organizations, documents, knowledge, ingestion…), adding an endpoint to a
module, or moving logic between layers.

## Workflow

1. **Place it.** `apps/api/src/modules/<domain>/` with one folder per layer it needs:
   `routes/<domain>.routes.ts`, `services/<domain>.service.ts`, `repositories/`, `schemas/`,
   `types/`, `constants/`, `mappers/`. Never create empty layers.
2. **Schemas first** (`schemas/<domain>.schemas.ts`): Zod with `.openapi()` names; infer types.
3. **Repository** (`repositories/<domain>.repository.ts`): Drizzle queries only, against tables
   from `@synapse/database`; add tables in `packages/database/src/schema/` + `bun run db:generate`. Tenant/owner scope is an
   explicit argument: `findById({ documentId, tenantId })`. Bounded queries (limit/pagination).
   Explicit transactions for multi-step writes.
4. **Service** (`services/<domain>.service.ts`): business rules and orchestration; depends on the repository
   interface; throws `AppError` with codes from `shared/constants` or the module's `constants/`.
   No Hono imports, no response building.
5. **Controller / route:** route declares method, path, middleware and OpenAPI schemas; controller
   (or the route handler when trivial) reads validated input, calls the service, returns
   `success(c, data, MODULE_MESSAGES.X, HTTP_STATUS.Y)` — always with a message constant. No business logic, no repository imports.
6. **Mapper** (`mappers/`) when DB rows, domain objects and API shapes differ.
7. **Public interface:** export what other modules or the composition root need from
   `modules/<domain>/index.ts`. Construct services in `server.ts`, mount routes in
   `routes/index.ts`.
8. **Config:** new env goes into `config/env.ts` + a typed `config/<area>.config.ts`; never read env
   in the module.
9. **Tests:** service unit tests with a fake repository; route tests through `createApp`;
   repository integration tests against pgvector when queries change.
10. Update `docs/api/endpoints.md` and the module's docs.

## Done when

- `bun run architecture:check` passes (layering, isolation, env, response rules)
- `bun run lint`, `bun run typecheck`, `bun run test` pass
- No status code, error code or message string duplicated across modules

## References

- `.agents/rules/backend-architecture.md`, `.agents/rules/configuration.md`,
  `.agents/rules/api-design.md`, `.agents/rules/database.md`
- `docs/development/backend-architecture.md`
