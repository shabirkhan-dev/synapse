# Frontend architecture

> **Status:** Live. `apps/console` has `lib/api`, `lib/query`, TanStack Query, `@synapse/ui` and
> ten features: `auth` (sign-in/up, verify, reset, session gate, current user — syn-018, syn-037),
> `documents` (list + add — syn-018; a document's page with its chunks, versions and delete —
> syn-046), `playground` (ask, cited answer, passages, provenance,
> feedback — syn-038), `oversight` (approvals queue, approve/reject, the purge request on Documents
> — syn-040), `activity` (the audit trail — syn-040) and `organizations` (header switcher, team
> page: create a team, members, roles — syn-043) and `chat` (streaming answers with tool calls,
> stored conversations — syn-044), `retrieval` (one query through each search mode — syn-048), `usage` (answers, tokens, cost —
> syn-049) and `account` (email verification, signed-in devices — syn-045).

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
apiStream(endpoints.chat.send, { method: "POST", body, signal }); // unread Response (SSE)
```

**Streaming (chat).** `apiStream` shares the bearer, 401-refresh and error mapping, and returns the
`Response` unread. The chat service turns its body into UI messages with `ai`'s
`parseJsonEventStream` + `uiMessageChunkSchema` + `readUIMessageStream` (no `@ai-sdk/react`:
`architecture:check` keeps `@ai-sdk/*` out of apps). `hooks/use-chat-thread.ts` owns the live
messages, Stop (abort) and a failed send's draft; the open conversation is `/chat?c=<id>`
(`useSearchParams`, so the page wraps the container in `Suspense`). A chat started on the page keeps
its thread mounted when the API returns `x-conversation-id`. Console tests keep Bun's native web
streams over happy-dom's (`test/setup.ts`), or `pipeThrough` fails.

**Shell (syn-047).** `components/layout/app-shell.tsx` is shadcn's `sidebar` (Base UI, `inset`
variant): organization picker at the top, nav groups Workspace / Oversight / Organization with
HugeIcons, the user (Account) and Sign out at the bottom, the page in a rounded inset panel under a
top bar with the sidebar toggle and the page name. Below 768px the sidebar is a drawer (Sheet) that
closes when a link is followed; Ctrl/⌘+B collapses it on wider screens and the open state is kept
in the non-auth `sidebar_state` cookie. Dark mode follows the system (`prefers-color-scheme`,
`color-scheme: light dark`); there is no `.dark` class and no toggle.

**UI quality.** Screens follow `.agents/skills/better-*` (installed from `jakubkrehel/skills`). The
first `better-interface` pass (syn-044) moved shared tokens in `packages/ui/src/styles/globals.css`:
`--ring` 0.556 and a solid `outline-ring` (focus indicators 4.7:1, were 1.5–2.6:1), `--muted-foreground`
0.52 (5.05:1 on `--muted`, was 4.34:1); inputs and textareas use 16px below `md` (no iOS zoom);
the main nav wraps at 320px and marks the current page with `aria-current`. The syn-045 pass made
`CardTitle` a real heading (`h2`, `render={<h1 />}` where the card is the page, as on the auth
pages, which had no `h1`) and keeps empty `role="status"` regions out of the layout
(`empty:sr-only`, still in the accessibility tree so their next message is announced). The syn-049
pass found tables cut off at 320px with no cue (documents, activity, usage): the shared `Table`
now measures itself and, only when wider than its space, fades its trailing edge, shows "Scroll
sideways to see all columns." and becomes a focusable region (arrow keys scroll it). The usage
chart is plain CSS bars (dataviz rules: ≤ 24px, 4px top radius, 2px gaps, one neutral hue, hover
tooltip per day, the same numbers in a table).

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

Every workspace page starts with `components/shared/page-header.tsx` (`title`, a one-line
description as children, optional `badge` and `actions`); lists with nothing in them use
`components/shared/empty-state.tsx` (an icon, a title and what to do next, on `@synapse/ui`'s
`Empty`). `components/shared/brand-mark.tsx` is the product mark (sidebar, signed-out pages, chat
replies). Colour comes only from the theme tokens in `packages/ui/src/styles/globals.css`: one indigo
accent (`--primary`, also `--ring`, `--sidebar-primary` and the current page in the sidebar) on
neutral surfaces, with light and dark values measured for contrast (noted next to each token).
Light, dark or system is chosen in the account menu at the foot of the sidebar
(`components/layout/account-menu.tsx`, a shadcn `DropdownMenu` with a radio group, Sign out and the
account link; a gear next to it opens the account page) and kept by `next-themes` 0.4.6 (`providers/theme-provider.tsx`): it puts `light` or
`dark` on `<html>` before paint, so Tailwind's `dark:` variant is the `.dark` class, not the media
query. Dark mode has depth by surface: the frame (`--sidebar`) is darkest, the page panel
(`--background`) a step lighter, cards lighter again. The current sidebar page is a neutral pill with
its icon in the accent; the main group has no visible heading; the top bar shows the page as a pill
tab; the dark panel has a soft accent glow in one corner. Chat: your message is a card, replies are
larger text, a search step is an expandable row, and the composer is a floating card with a round
send button. Counts next to sidebar links come in through `SessionGate`'s `navBadges`
(e.g. the oversight feature's `PendingApprovalsBadge`).

Untrusted text from the model or documents is never rendered as HTML. Answers (Playground and chat)
go through `components/shared/markdown.tsx`: `react-markdown` + `remark-gfm` render emphasis, lists,
code and tables as React elements, raw HTML in the text is shown as text, and links are followed
only for `http(s)` URLs (new tab, `noopener noreferrer`). Known `[n]` markers become in-page
citation links; sources become links only for `http(s)` URLs. Chat replies resolve `[n]` against
their own `searchDocuments` results (`features/chat/utils/citations.ts`, checked with Zod): each
becomes a `CitationPopover` (`components/shared/citation-popover.tsx`, the passage with its
document and source) and the cited documents are listed once each as source cards.

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

## Look and feel (syn-078, v4 since syn-090)

| Token | Value |
| --- | --- |
| Font | Inter (self-hosted, `@fontsource-variable/inter` imported by `@synapse/ui` `globals.css`), then Apple's system font; `letter-spacing: -0.15px` on `body` |
| Light surfaces (v4) | sidebar `#F5F5F5`, page `#FBFBFB`, cards white with `#ECECEC` borders and a faint shadow; current page a grey pill `#EBEBEB`; text `#1C1C1C`, secondary `#6B6B6B` |
| Dark surfaces (v4) | sidebar and page `#1A1A1A`, cards `#1E1E1E`, chips and hover `#262626`, borders `#2A2A2A`, popovers `#222222` |
| Text | dark `#E5E5E5`, secondary `#A1A1A1` (13.8:1 and 6.7:1 on `#1A1A1A`) |
| Accent (v4) | one blue `#3556F5` for actions (white text 5.5:1, both themes); blue text uses `--link` (`#3556F5` light, `#7D93FF` dark); `--success` / `--warning` for good and caution |
| Data (v4) | `--chart-1…5` in a fixed order: orange (the highlight), sky blue, amber, teal, grey; checked with the dataviz `validate_palette.js` in both themes; quiet bars `--chart-muted` |
| Radius | `rounded-sm` 6px, `rounded-md`/`lg` 8px, `rounded-xl` 12px (inner widgets, dialogs), `rounded-2xl` 16px (cards), or `rounded-full` |
| Size | 14px for body, controls, labels, tables and menus (`text-sm`); 12px only for hints and metadata; controls 36px (inputs and default buttons), 32px small |
| Icons | HugeIcons only |
| Mono | JetBrains Mono (self-hosted, `@fontsource-variable/jetbrains-mono`) for ids, model names and versions, and since v4 for figures, counts, number cells, table headers and small labels (uppercase, `tracking-[0.06em]`, 11px) |

**Onboarding (syn-088).** `features/onboarding` renders the Get started card into the Documents
page through `DocumentsContainer`'s `intro` slot (set in `app/(workspace)/documents/page.tsx`), so the
two features never import each other. Sample documents are fixtures in
`features/onboarding/constants/sample-documents.ts`, posted through the normal ingest endpoint.

**Primitives (syn-091).** The shadcn components in `@synapse/ui` carry the design system; pages use
their variants and only add layout classes:

| Primitive | Look |
| --- | --- |
| Button | 8px, 36px, medium 14px, 16px icons; `default` blue with a top highlight, `outline` bordered on the card colour, `ghost`, `secondary` grey chip, `destructive` tinted red |
| Input, Textarea, Select, InputGroup | bordered field on `--field`, `shadow-control`, blue focus ring at 15% |
| Badge | neutral chip, `outline`, mono `count`, tinted `success` / `warning` / `destructive` / `info` / `violet` / `orange` (text 4.5:1+ on its tint) |
| Tabs | icon + label, current tab in a grey chip; `segmented` (tray) and `line` variants |
| Select, DropdownMenu, Popover, Command | 12px, border, `shadow-pop`, 8px item rows, mono uppercase group labels and shortcuts |
| Dialog, AlertDialog | 16px, `p-6`, 16px titles, light overlay |
| Card | 16px, `shadow-card`, 24px padding; `CardTitle` takes a leading 18px muted icon and a count `Badge`; `CardFooter` is a muted meta row |
| Alert | 12px, 16px icon; `destructive` / `success` / `warning` tints |
| Empty | bordered icon tile |

Tokens: `--field`, `--tone-{green,amber,red,blue,violet,orange}`, `shadow-card` / `shadow-control` /
`shadow-pop` (none in dark except popups). No hand-written `dark:` colours in features: use a token or
a variant.

The shell (v4, after the human's three references, 2026-11-22): the sidebar opens with a workspace
row (product mark, team name with ⇕, collapse button) and a "Search /" row (`/`, ⌘K or Ctrl+K open
the palette), then the pages under mono uppercase group labels, a "Recent" group (latest three
conversations and two documents, mono `CHAT` / `DOC` tags, its own `Recent` landmark) and an account
card (avatar, name, address, settings). The header is a breadcrumb `Section › [icon] Page`; its
sidebar button shows only on phones or with the sidebar collapsed. `PageHeader` takes a `meta`
count in mono capitals (Documents: "2 documents"). Data widgets live in `components/shared`:
`StatStrip` (KPI row split by rules), `BarRows` (parts of a whole as horizontal bars), `TickMeter`
(a share as ticks) and the pill bar chart on Usage (quiet bars, the busiest or hovered day in
orange, its table kept). `StatusDot` is a tinted pill (4.5:1+ text on its tint). Pick-one controls use `components/shared/segmented-control`;
states use `components/shared/status-dot` (a dot plus the label, never colour alone). `SidebarInset`
is a `div`: the page's own `<main>` is the only main landmark.

Details (syn-079): table text starts at the card's edge (first and last cells have no outer
padding), headers are muted 13px, numbers use `tabular-nums`, rows have no hover (they are not
clickable); a ghost button that ends a row or a line takes `-me-3` / `-ms-3` so its label lines up.
Buttons scale to 0.96 when pressed (only with motion allowed) and name the properties they
transition. Card descriptions stop at 65 characters a line. A form with several ways in uses
`@synapse/ui` `Tabs` (Documents: Upload files · Paste text · Web page, each panel kept mounted);
extra detail goes behind `components/shared/disclosure` (a chevron, not the browser's triangle);
inline citation numbers share one look (`components/shared/citation-mark`) in chat and the
Playground. Scrolling menus and lists in popovers use `overscroll-contain`.

## Document access (syn-081)

In a team, the Documents add panel has **Only me for now** (sends `access: "restricted"` with any of
the three ways in), the list marks restricted documents with a lock (named "(restricted)" for
assistive tech), and a document's page has **Who can see it** (`DocumentAccessCard`: everyone, or
chosen members; owners, admins and the adder are shown as always reading it). Whether you are in a
team comes from `/auth/me` (a personal organization's id is the user's id); members come from
`useMembersQuery` exported by the organizations feature.

## Shell extras (syn-075)

- **Command palette** (`features/command-palette`): ⌘K / Ctrl+K or the top-bar Search button; pages
  (from `components/layout/navigation.ts`, shared with the sidebar), recent conversations and
  documents, fetched only once the palette opens (`enabled` on their query hooks). shadcn `command`
  (cmdk) inside our `Dialog` so the title is inside the popup (accessible name).
- **Copy and regenerate**: `components/shared/copy-button.tsx` on chat replies and the Playground
  answer; chat Regenerate on the last reply of a stored conversation (`chatService.regenerate`), the
  Playground's "Ask again" repeats the last question with its passages and scope.
- **Document scope** (`components/shared/document-scope.tsx`): the "Search in" picker of the Playground
  and, since syn-076, the top of a chat thread (turns and regenerate send `documentIds`).
- **Follow-ups** (`features/follow-ups`): `FollowUpsContainer` under a finished answer in chat and the
  Playground; one `POST /rag/follow-ups` per answer (cached forever, no retry, failures show nothing).

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
