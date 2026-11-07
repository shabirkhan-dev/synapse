---
name: frontend-feature-development
description: Use when building or changing a console feature: pages, containers, presentation components, query/mutation hooks, feature services, the API client or query keys.
---

# frontend-feature-development

> Status: Live standard. `apps/console` is bare: `features/`, `lib/api/`, `lib/query/` and
> TanStack Query are created with the first feature.

## When to use

Any new screen or data interaction in `apps/console`.

## Workflow

1. **Place it.** `apps/console/src/features/<feature>/`. Pages in `app/` only render a container.
2. **Types and schemas** (`types/`, `schemas/`): the feature's contracts; Zod for forms and for
   validating API responses where it matters.
3. **Service** (`services/<feature>.service.ts`): plain functions calling `api<T>(path, options)`
   from `@/lib/api/client`. No React, no TanStack Query, no `fetch`.
4. **Query keys:** add a factory to `lib/query/query-keys.ts` (`queryKeys.users.all`,
   `queryKeys.users.detail(id)`).
5. **Hooks:** one per file — `hooks/queries/use-users-query.ts`,
   `hooks/mutations/use-create-user-mutation.ts`. Mutations invalidate via the key factory.
6. **Presentation components** (`components/`): props in, events out; built from `@synapse/ui`
   (add primitives with `bunx --bun shadcn@latest add <name>` in `packages/ui`).
7. **Container** (`containers/`): calls hooks, handles loading/error/empty states, renders
   presentation components. Skip it when a component needs no data.
8. **Public interface:** `features/<feature>/index.ts` exports what pages and other features use.
9. **Config:** `NEXT_PUBLIC_*` values only, read in `src/config/`.
10. Tests: component tests for presentation, integration tests for containers with a mocked client.

## Done when

- `bun run architecture:check` passes (fetch only in `lib/api`, plain services, hook naming,
  presentation isolation, feature isolation, env)
- `bun run lint`, `bun run typecheck`, `bun run build` pass
- Loading, error and empty states handled in the container

## References

- `.agent/rules/frontend-architecture.md`, `.agent/rules/configuration.md`
- `docs/development/frontend-architecture.md`, `packages/ui/README.md`
