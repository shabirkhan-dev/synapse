---
name: backend-module-development
description: Use when creating or changing a backend domain module in apps/api (routes, controllers, services, repositories, schemas, types, constants, mappers), or touching config, shared errors and responses.
---

# backend-module-development

> Status: Live standard. `apps/api` is partly migrated: modules have public `index.ts` files and
> pass the layering checks, but still use flat `<name>.<role>.ts` files and `common/` instead of
> `shared/`, and inline status codes instead of `HTTP_STATUS` constants.

## When to use

Adding a domain (users, organizations, documents, knowledge, ingestion…), adding an endpoint to a
module, or moving logic between layers.

## Workflow

1. **Place it.** `apps/api/src/modules/<domain>/`. Start flat (`<domain>.routes.ts`,
   `<domain>.service.ts`, …); switch to folders (`routes/`, `services/`, …) when a layer has more
   than one file. Never create empty layers.
2. **Schemas first** (`schemas/` or `<domain>.schemas.ts`): Zod with `.openapi()` names; infer types.
3. **Repository** (`<domain>.repository.ts`): Drizzle queries only. Tenant/owner scope is an
   explicit argument: `findById({ documentId, tenantId })`. Bounded queries (limit/pagination).
   Explicit transactions for multi-step writes.
4. **Service** (`<domain>.service.ts`): business rules and orchestration; depends on the repository
   interface; throws `AppError` with codes from `shared/constants` or the module's `constants/`.
   No Hono imports, no response building.
5. **Controller / route:** route declares method, path, middleware and OpenAPI schemas; controller
   (or the route handler when trivial) reads validated input, calls the service, returns via the
   shared `success(...)` helper. No business logic, no repository imports.
6. **Mapper** (`mappers/`) when DB rows, domain objects and API shapes differ.
7. **Public interface:** export what other modules or the composition root need from
   `modules/<domain>/index.ts`. Wire it in `app.ts` / `routes/index.ts`.
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

- `.agent/rules/backend-architecture.md`, `.agent/rules/configuration.md`,
  `.agent/rules/api-design.md`, `.agent/rules/database.md`
- `docs/development/backend-architecture.md`
