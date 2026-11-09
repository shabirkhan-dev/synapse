# Frontend architecture

> **Status:** Live. `apps/console` has `lib/api`, `lib/query`, TanStack Query, `@synapse/ui` and
> two features: `auth` (sign-in, session gate) and `documents` (list + add) — syn-018.

Agent rules: `.agents/rules/frontend-architecture.md`, `.agents/rules/configuration.md`.
Playbook: `.agents/skills/frontend-feature-development/`.

Backend and frontend are modular in the same spirit but do not share internal structure.

## Layout

```text
apps/console/src/
├── app/                   # (auth)/ (workspace)/ layout.tsx globals.css — thin pages
├── components/            # ui/ layout/ shared/
├── features/
│   ├── users/ · knowledge/ · ingestion/ · retrieval/ · playground/
│   ├── agents/ · evaluations/ · observability/
├── lib/
│   ├── api/               # client.ts endpoints.ts api-error.ts
│   ├── query/             # query-client.ts query-keys.ts
│   └── utils/
├── providers/ · config/ · hooks/ · types/ · styles/
```

### Feature layout

```text
features/users/
├── components/            # user-table.tsx user-form.tsx user-card.tsx (presentation)
├── containers/            # users-container.tsx user-details-container.tsx
├── hooks/
│   ├── queries/           # use-users-query.ts use-user-query.ts
│   └── mutations/         # use-create-user-mutation.ts use-update-user-mutation.ts use-delete-user-mutation.ts
├── services/user.service.ts
├── types/user.types.ts
├── schemas/user.schema.ts
├── constants/user.constants.ts
└── index.ts               # public interface
```

| Layer | Responsibility |
| --- | --- |
| Components | Presentation; props in, events out |
| Containers | Connect feature state (hooks) to presentation |
| Hooks | TanStack Query and feature interaction logic |
| Services | Plain API operation functions |
| API client | Transport, headers, serialization, errors |
| Types / Schemas / Constants | Contracts, runtime validation, feature values |

**Request flow:** page → container → query/mutation hook → feature service → API client → Hono API.

## API client

`lib/api/client.ts` is the only code that calls `fetch`:

```ts
api(endpoints.documents.list, { schema: documentListSchema }); // → z.infer<typeof schema>
api(endpoints.auth.signIn, { method: "POST", body: input, auth: false, schema: signedInSchema });
```

| Concern | How |
| --- | --- |
| Base URL | `apiConfig.baseUrl` (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000/api/v1`) |
| Auth | `authorization: Bearer <access token>` from `lib/api/session.ts` unless `auth: false` |
| Refresh | On a 401 with a session: one shared `POST /auth/refresh` (refresh tokens are single-use, so concurrent 401s wait for the same rotation), then one retry; a failed refresh clears the session |
| Responses | Success envelope → `data`, validated with the call's Zod `schema` (`INVALID_RESPONSE` otherwise) |
| Errors | Error envelope → `ApiError { status, code, message, details?, requestId? }`; unreachable API → `NETWORK_ERROR` (status 0). Branch on `code`, show `message` |
| Session | Tokens in memory + `sessionStorage` (`synapse.session`): a reload keeps the session, closing the tab ends it; `useSessionStatus()` re-renders on change (`unknown` during SSR) |

The session lives where page scripts can read it — the trade-off of a browser-only client. Moving
the refresh token into an httpOnly cookie behind a same-origin BFF is part of syn-037.

## Feature service

```ts
// features/documents/services/documents.service.ts — plain functions, no React / TanStack Query
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { documentListSchema, documentSchema } from "../schemas/document.schema";
import type { DocumentSummary, IngestDocumentInput } from "../types/document.types";

export const documentsService = {
	list: (): Promise<DocumentSummary[]> =>
		api(endpoints.documents.list, { schema: documentListSchema }),
	ingest: (input: IngestDocumentInput): Promise<DocumentSummary> =>
		api(endpoints.documents.ingest, { method: "POST", body: input, schema: documentSchema }),
};
```

## Query keys and hooks

```ts
// lib/query/query-keys.ts
export const queryKeys = {
	users: {
		all: ["users"] as const,
		detail: (id: string) => ["users", id] as const,
	},
};
```

```ts
// features/users/hooks/queries/use-users-query.ts
export function useUsersQuery() {
	return useQuery({ queryKey: queryKeys.users.all, queryFn: userService.getAll });
}

// features/users/hooks/mutations/use-create-user-mutation.ts
export function useCreateUserMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: userService.create,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
	});
}
```

One hook per file; never one giant `user.hooks.ts`.

## Container and presentation

```tsx
// features/users/components/user-table.tsx — presentation
export function UserTable({ users, onDelete }: { users: User[]; onDelete: (id: string) => void }) {
	return (/* table rows using @synapse/ui primitives */);
}

// features/users/containers/users-container.tsx
export function UsersContainer() {
	const usersQuery = useUsersQuery();
	const deleteMutation = useDeleteUserMutation();
	if (usersQuery.isPending) return <p>Loading users...</p>;
	if (usersQuery.isError) return <p>Unable to load users.</p>;
	return <UserTable users={usersQuery.data} onDelete={(id) => deleteMutation.mutate(id)} />;
}
```

Don't create a container for a component that needs no data.

## Tests

`bun --cwd=apps/console test` (Bun + happy-dom + Testing Library, `test/setup.ts` preloaded):
presentation components with props, containers inside a fresh `QueryClient` with `fetch` mocked at
the boundary (`test/helpers.tsx`: `mockFetch`, `ok`, `failure`), and the API client (envelope,
schema, network error, single shared refresh). Browser checks: `.agents/skills/browser-ui-test/`.

## Configuration

Browser config lives in `src/config/` and reads only `NEXT_PUBLIC_*` variables (e.g.
`NEXT_PUBLIC_API_URL`). Server secrets never reach the console bundle.

## Enforcement

`bun run architecture:check` (pre-commit and CI):

| Check | Fails when |
| --- | --- |
| API client | `fetch(` used outside `src/lib/api/` |
| Plain services | `features/*/services/` imports React, Next or TanStack Query |
| Presentation | `features/*/components/` imports hooks, services, TanStack Query or the API client |
| Hook naming | a file in `hooks/queries/` or `hooks/mutations/` is not `use-*-query.ts` / `use-*-mutation.ts` |
| Feature isolation | a file imports another feature's internals instead of its `index.ts` |
| Env | `process.env` / `import.meta.env` used outside `src/config/` |
