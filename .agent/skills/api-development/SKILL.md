---
name: api-development
description: Use when adding or changing an HTTP route, middleware, auth, or the response contract in apps/api.
---

# api-development

> Status: Live. Applies to `apps/api` (Hono + @hono/zod-openapi).

## When to use

New endpoint, changed request/response schema, new error code, auth or middleware change.

## Workflow

1. Define Zod schemas in `src/modules/<area>/<area>.schemas.ts` with `.openapi()` names and examples.
2. Declare the route with `createRoute` in `<area>.routes.ts`: method, path, tags, summary, `security` for protected routes, request schemas, every response including `errorResponses`.
3. Keep handlers thin: validate → call a service → return `success(c, data, status)`. Business logic lives in a service (later: a domain package).
4. Throw `AppError(status, CODE, message)` for expected failures; never build error JSON by hand.
5. Mount the router in `src/app.ts`; apply auth middleware for protected paths.
6. Add tests in `apps/api/test/` (success, 401/422/404 paths) using the helpers in `test/helpers.ts`.
7. Update `docs/api/endpoints.md` and, for convention changes, `docs/api/conventions.md`.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agent/rules/documentation.md`
- The route appears correctly in `/api/openapi.json`

## References

- `.agent/rules/api-design.md`
- `docs/api/`
- `apps/api/README.md`
- `.agent/skills/backend-module-development/` — full module layering (routes → controllers → services → repositories)
- `.agent/rules/backend-architecture.md`
