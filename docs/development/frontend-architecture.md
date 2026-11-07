# Frontend architecture

> **Status:** Live standard. `apps/console` is bare; this structure is created with the first
> feature (TanStack Query, `lib/api`, `lib/query` are not installed yet).

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

Created once in `lib/api/client.ts`; the only place that calls `fetch`.

```ts
import { apiConfig } from "@/config/api.config";
import { ApiError } from "./api-error";

type RequestOptions = {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: unknown;
	headers?: HeadersInit;
	signal?: AbortSignal;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const response = await fetch(`${apiConfig.baseUrl}${path}`, {
		method: options.method ?? "GET",
		headers: { "Content-Type": "application/json", ...options.headers },
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
		signal: options.signal,
		credentials: "include",
	});
	const result = await response.json();
	// error envelope: { message, error: { code, details? } } — branch on error.code
	if (!response.ok) throw new ApiError(result, response.status);
	return result.data as T;
}
```

A starting point: auth refresh, non-JSON responses, request ids (`x-request-id`) and response
validation must be handled deliberately before production.

## Feature service

```ts
// features/users/services/user.service.ts — plain functions, no React / TanStack Query
import { api } from "@/lib/api/client";
import type { CreateUserInput, User } from "../types/user.types";

export const userService = {
	getAll: () => api<User[]>("/api/v1/users"),
	getById: (id: string) => api<User>(`/api/v1/users/${id}`),
	create: (input: CreateUserInput) => api<User>("/api/v1/users", { method: "POST", body: input }),
	delete: (id: string) => api<void>(`/api/v1/users/${id}`, { method: "DELETE" }),
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
