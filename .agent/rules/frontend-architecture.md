# Rule: frontend architecture

Applies to `apps/console`. Full standard with examples: `docs/development/frontend-architecture.md`.

## Layout

```text
apps/console/src/
├── app/                # Next.js routes: (auth)/ (workspace)/ layout.tsx globals.css
├── components/         # ui/ (from @synapse/ui) layout/ shared/
├── features/<name>/    # components/ containers/ hooks/{queries,mutations}/ services/ types/ schemas/ constants/ index.ts
├── lib/api/            # client.ts endpoints.ts api-error.ts — the only place that calls fetch
├── lib/query/          # query-client.ts query-keys.ts
├── providers/ · config/ · hooks/ · types/ · styles/
```

## Rules

1. **Feature-based.** Each feature owns its components, containers, hooks, services, types,
   schemas and constants. Pages in `app/` stay thin and render containers.
2. **Request flow:** page → container → query/mutation hook → feature service → `lib/api` client →
   API.
3. **One API client** in `lib/api/`; it is the only code that calls `fetch`. It owns base URL,
   headers, serialization, credentials and `ApiError` mapping.
4. **Feature services are plain functions** — no React, TanStack Query or Next imports.
5. **Hooks are split:** one hook per file in `hooks/queries/use-<thing>-query.ts` or
   `hooks/mutations/use-<action>-<thing>-mutation.ts`. No giant `*.hooks.ts` files.
6. **Query keys come from factories** in `lib/query/query-keys.ts` — used by both queries and
   invalidation. No scattered raw key arrays.
7. **Presentation components** (`components/`) receive data and callbacks via props; they never
   import hooks, services, TanStack Query or the API client. **Containers** connect hooks to
   presentation. Do not add a container for a component that needs no data.
8. **Features talk through public interfaces:** import another feature only via its `index.ts`.
9. **UI primitives come from `@synapse/ui`** (shadcn on Base UI, HugeIcons). No other component
   library, no lucide.
10. Validate forms and external responses with Zod at the boundary.

Enforced by `bun run architecture:check` (`scripts/architecture/check-layers.sh`), which runs in the pre-commit hook and CI. Rules 3, 4, 5 (naming), 7 and 8 are checked automatically; the rest in review.
