# Frontend architecture

> **Status:** Live. `apps/console` has `lib/api`, `lib/query`, TanStack Query, `@synapse/ui` and
> six features: `auth` (sign-in/up, verify, reset, session gate, current user — syn-018, syn-037),
> `documents` (list + add — syn-018), `playground` (ask, cited answer, passages, provenance,
> feedback — syn-038), `oversight` (approvals queue, approve/reject, the purge request on Documents
> — syn-040), `activity` (the audit trail — syn-040) and `organizations` (header switcher, team
> page: create a team, members, roles — syn-043).

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
| Request ids | Pass `headers: { "x-request-id": … }` to tie a call to a later one (the API keeps a well-formed id): the playground names each question `console_<uuid>` and sends it with the feedback |
| Base URL | `apiConfig.baseUrl` (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000/api/v1`) |
| Auth | `authorization: Bearer <access token>` from `lib/api/session.ts` unless `auth: false`; `credentials: "include"` on every call (the API scopes its cookie to `/auth`) |
| Refresh | On a 401: `POST /auth/refresh` with `{}` — the httpOnly cookie carries the refresh token (ADR-0007). One at a time per tab and, through the Web Locks API, across tabs (refresh tokens are single-use; two tabs sending the same cookie would look like reuse and revoke the session); then one retry. A refused refresh signs the tab out; an unreachable API does not |
| Responses | Success envelope → `data`, validated with the call's Zod `schema` (`INVALID_RESPONSE` otherwise) |
| Errors | Error envelope → `ApiError { status, code, message, details?, requestId? }`; unreachable API → `NETWORK_ERROR` (status 0). Branch on `code`, show `message` |
| Session | Only the 15-minute access token, in memory. A page load starts `unknown`; `useSessionStatus()` restores the session with one cookie refresh (`restoreSession`) and re-renders on change |

Nothing auth-related is in web storage or `document.cookie`. Console and API must be on the same
site for the `SameSite=Strict` cookie (ADR-0007). Pages: `(auth)/sign-in`, `sign-up`,
`forgot-password`, `reset-password?token=`, `verify-email?token=` (the last two read the token
server-side, send no referrer, spend it once and remove it from the address bar);
`(workspace)/documents`, `playground`, `approvals`, `activity` and `team` behind `SessionGate`.
Features reuse each other only through `index.ts` (`useCurrentUserQuery` from `auth`,
`PurgeRequestContainer` from `oversight`); the workspace layout hands `SessionGate` the
`OrganizationSwitcherContainer` as a slot, so `auth` never imports `organizations`.

**Organizations.** `GET /auth/me` says which organization the access token acts in and the role
there. Switching (`POST /auth/switch-organization`, or creating a team, which switches into it)
stores the new access token and calls `queryClient.resetQueries()`: every cached answer belonged
to the old organization. Controls a role cannot use are hidden with `can(role, permission)` from
`lib/permissions.ts`, a copy of the API's rules for `approvals.decide` and `members.manage(_admins)`;
the API still checks every request. Keep the two in step when roles change.

Forms submit with `components/shared/submit-button.tsx`: disabled in the server HTML and until
hydration, since a click before React attaches the handler would do nothing.

Untrusted text from the model or documents is rendered as React text only (never HTML); `[n]`
markers become in-page links, and sources become links only for `http(s)` URLs.

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
