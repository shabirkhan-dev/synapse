---
id: syn-018
title: Wire @synapse/ui into the console and build the first feature
type: feature
from: human
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-017]
branch: main
worktree: none
scope: [apps/console]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-09
---

## What

Tailwind + `@synapse/ui`, `lib/api` client, TanStack Query, and a first feature (documents list + ingest) per the frontend standard.

## Why / Context

The console is bare; this sets the pattern every feature copies.

## Proposal or Ask

Follow `.agents/skills/frontend-feature-development/`.

## Scope

**In scope:**

- `apps/console/**`, `packages/ui/**`

**Out of scope:**

- other features

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- `bun run build`; browser check of the page

## Resolution

Done in commit `feat(console): add sign-in and the documents feature on @synapse/ui`.

- Wiring: Tailwind v4 via `@synapse/ui/postcss.config`, `@synapse/ui/globals.css`, `transpilePackages`, TanStack Query provider (one client per tab), `config/api.config.ts` (`NEXT_PUBLIC_API_URL`, Zod). shadcn primitives added to `@synapse/ui` with the CLI: alert, card, input, label, table, textarea.
- `lib/api`: the only `fetch`; `api(path, { schema })` validates `data` with Zod, error envelope → `ApiError` (`code`, `message`, `requestId`), `NETWORK_ERROR`, bearer token, one shared refresh on 401 then one retry, failed refresh clears the session; `session.ts` (memory + `sessionStorage`, corrupted entries ignored); `endpoints.ts`. `lib/query`: query-client (no retries on 4xx), query-keys.
- `features/auth`: sign-in form (Zod, field errors, API message), sign-in container, `SessionGate` (redirects signed-out visitors; app shell with sign-out that clears the query cache), `useSessionStatus` (SSR-safe). `features/documents`: list query, ingest mutation (invalidates the list), table, add form (keeps text on error, clears on success), container with loading/error (+ retry)/empty states. Pages: `/` → `/documents`, `(auth)/sign-in`, `(workspace)/documents`.
- Tests: 16 (Bun + happy-dom + Testing Library): API client (envelope, schema, network, concurrent 401 → one refresh with rotated tokens stored, failed refresh signs out, sign-in sends no token), forms, table, container with mocked fetch (loading → empty, add → POST + list refetch, error → retry, ingest error keeps text).
- Found on the way: CI's `test:coverage` list skipped `reliability`, `providers` and `native` (their tests never ran in CI) — added with the console.
- Docker: console image copies `packages/ui`; `NEXT_PUBLIC_API_URL` is a build arg (compose passes it).
- **Validation:** `next build` (4 static routes); browser run with Playwright against the built API and the standalone console: signed-out redirect, field errors, "Email or password is incorrect", sign-in → empty state, add validation, add → row in the table and form cleared, reload keeps the session, sign-out clears `sessionStorage` and redirects, 390 px layout; no page or console errors (besides the browser's own log of the rejected sign-in's 401).
- **Not done (syn-037):** sign-up, verify-email, reset-password pages; httpOnly-cookie session. No committed e2e suite.
