# Testing

> **Status:** Live (unit and integration tests in every package and app, console component tests,
> browser e2e in `tests/e2e`, security, chaos and load suites in `tests/system`, retrieval
> evaluation).

| Kind | Where | Run |
| --- | --- | --- |
| Unit | `apps/api/test/*.test.ts` (LLM + embeddings mocked) | `bun run test` |
| Integration (pgvector) | `apps/api/test/rag.repository.integration.test.ts` | set `API_TEST_DATABASE_URL`, then `bun --cwd=apps/api run test` |
| Bash scripts | `scripts/bash/tests/` | `bun run test:scripts` |
| Console unit/component | `apps/console/test/` (Bun + happy-dom + Testing Library, `fetch` mocked) | `bun --cwd=apps/console test` |
| Browser e2e (console + API) | `tests/e2e/specs/` (Playwright 1.63, Chromium) | `E2E_DATABASE_URL=… bun run test:e2e` (CI: `e2e` job) |
| Security (API) | `tests/system/security/` | `SYSTEM_DATABASE_URL=… bun run test:security` (CI: `system` job) |
| Chaos (API) | `tests/system/chaos/` | `SYSTEM_DATABASE_URL=… bun run test:chaos` (CI: `system` job) |
| Load (API) | `tests/system/load/run.ts` | `SYSTEM_DATABASE_URL=… bun run test:load` (manual) |
| Retrieval quality | `packages/evaluation` + `apps/api/src/evaluate.ts` | `DATABASE_URL=… bun run eval:retrieval` (CI: `api` job) |

`bun run preflight` = lint + typecheck + test. CI (`.github/workflows/ci.yml`) runs lint, typecheck,
build, test and an `api` job with a pgvector service (integration test + boot smoke test).

## Browser e2e (`tests/e2e`)

`bun run test:e2e` starts three servers on their own ports (so it never collides with
`bun run dev`): a fake OpenAI-compatible model provider (`:5601`, deterministic embeddings, one
cited answer, and for streaming chat a `searchDocuments` call followed by a chunked answer), the API from source (`:8100`, development mode, so emails are written to its log),
and the console built for that API (`:3100`). Before the API starts, `support/prepare-database.ts`
migrates `E2E_DATABASE_URL` (a throwaway Postgres with pgvector) and clears `auth_rate_limits`
(every test signs up from 127.0.0.1). The API runs with `TRUST_PROXY=true` so API-side sign-ups
(`support/accounts.ts`) each send their own `x-forwarded-for` and do not use up the per-IP sign-up
limit; browser requests carry none. Tests read emailed links from `.output/api.log`
(`support/mail.ts`). After clicking a link to another auth page, wait for that page (both have an
"Email" field) before typing. Stress check: `bun run test:e2e -- --repeat-each=5 --workers=4 --retries=0`.

| Spec | Covers |
| --- | --- |
| `auth.spec.ts` | signed-out redirect; sign-up with policy errors; refresh token only in the httpOnly `SameSite=Strict` cookie; reload restores; verify link; sign-out clears the cookie; two tabs reloading together ×3 (the Web Lock — the test fails without it); forgot → reset → reused link refused → old password refused |
| `workspace.spec.ts` | no-documents answer → add a document → Ctrl+Enter → cited answer, `[1]` jumps to its source, provenance, rating saved |
| `oversight.spec.ts` | delete-all needs approval (dialog closes, request survives a reload) → approve → documents gone → activity shows request and decision; reject keeps the documents |
| `teams.spec.ts` | two browsers: owner creates a team and adds an admin (the role picker then resets to Member) and a member; the member switches in, adds a document, asks to delete all and sees "waiting", cannot manage the team; the owner approves; personal workspace untouched; promoting the member shows on their next load |
| `documents.spec.ts` | (upload) a `.pptx` is refused in the browser; a Markdown file is stored under its name with the file name as its source, the picker resets, and its text (Markdown kept) shows on the document page · a title in the list opens the document's page (source link, "Chunk 1" with its text, no "Out of date"; the sidebar marks Documents `aria-current="true"`); delete asks first, returns to an empty list; the old address then says the document does not exist |
| `retrieval.spec.ts` | two documents → Retrieval → "Compare": the Keywords column has only the matching document, Hybrid's first passage is it with "Fused (RRF) score" and "also #… in Meaning, #1 in Keywords", Meaning labels cosine; a title opens the document page |
| `usage.spec.ts` | a new account sees "No answers"; after one Playground answer, Usage shows 1 answer, the busiest day, a row for the fake chat model with its prompt version and "No prices set"; the 7-day range keeps it (answers refresh usage, not a stale cache) |
| `chat.spec.ts` | (also) the reply then shows in Usage as a Chat row with `chat-assistant@n` and the fake model · Enter sends; Stop shows while streaming; the answer streams after a "Searched your documents for …" row with its sources; the conversation gets an address, survives a reload, is listed, reopens after "New chat", and is deleted after a confirmation |
| `account.spec.ts` | an unverified user sees the notice on every page → Account → "Send a new link" → the new link (not the sign-up one) verifies → notice gone; a second browser (iPhone UA) signs in → listed as "Safari on iOS" next to "This device" → "Sign out everywhere else" (confirmed) → the other browser is sent to sign-in on reload, this one stays |
| `layout.spec.ts` | (also) at 320 px a table wider than the screen is a focusable "Table, scrolls sideways" region with the hint, and ArrowRight scrolls it (fails on the old table) · (sidebar shell) at 320 px every workspace page keeps the drawer button on screen with no sideways scroll, and the drawer shows all six links, Sign out and the current page; following a drawer link closes it. Before syn-047: at 320 px (WCAG reflow) every workspace page (incl. account) had no sideways scroll, every main-nav link and Sign out fully on screen, and the current page marked `aria-current` |

Debug a failure: `bun run test:e2e -- --trace on -g "<test name>"`, then open
`tests/e2e/.output/results`. Locally a running console on `:3100` is reused (stop it after
changing console code); in CI every server starts fresh and failures upload `.output/`.

## System suites (`tests/system`)

Security, chaos and load against the API from source, with no browser. Each test file starts its
own stack (`support/stack.ts`, under a second): the e2e fake model (`:5602`), a TCP proxy in front
of Postgres (`:5499`, `support/database-proxy.ts`) and the API (`:8200`, development mode, a known
`JWT_SECRET` so tests can sign tokens). `SYSTEM_DATABASE_URL` is a throwaway Postgres with pgvector;
it is migrated and its `auth_rate_limits` cleared first. The API log is `tests/system/.output/api.log`.
Faults: `stack.database.cut()` / `restore()` drops and refuses Postgres connections;
`stack.modelFault({ delayMs?, status?, only? })` makes the fake model slow or failing (`{}` heals).

| File | Covers |
| --- | --- |
| `security/tenancy.test.ts` | another tenant cannot read, list, search (all three modes) or delete a document; another user cannot read or delete a conversation or see facts; a non-member cannot list, join or switch into an organization; a correctly signed token naming someone else's organization → `401 AUTH_NOT_A_MEMBER` |
| `security/tokens.test.ts` | every protected route in `/api/openapi.json` → 401 without a token; tampered, `alg: none`, wrong-secret, expired and garbage tokens → `401 AUTH_ACCESS_TOKEN_INVALID`; a replaced refresh token reused after the grace window revokes the session (the new token too); a signed-out session cannot refresh |
| `security/limits.test.ts` | every `POST` route → `413 PAYLOAD_TOO_LARGE` over 2 MiB (found: only auth and document upload had a limit); malformed JSON → 4xx envelope, no stack; the 11th sign-in for one email → `429 AUTH_RATE_LIMITED`; `nosniff`, `SAMEORIGIN`, HSTS, no `x-powered-by`; CORS answers the console origin only |
| `chaos/database.test.ts` | Postgres cut: liveness 200, readiness `503 DATABASE_UNAVAILABLE` and requests fail in < 5 s with the envelope (no driver text); restored: ready again within 20 s (≈0.3 s locally; the time is printed), sign-in works (found: the API process crashed — the checkpointer's `pg` pool had no `error` listener) |
| `chaos/model.test.ts` | slow model → `504 RELIABILITY_TIMEOUT` before the model would answer; failing model → `503 RELIABILITY_CIRCUIT_OPEN`, closed again after the reset; keyword search still answers; a failed ingest leaves no document; a failing streamed chat ends with an error part |

**Load** (`load/run.ts`): five accounts with three documents each, then `LOAD_CONCURRENCY` (20)
virtual users for `LOAD_DURATION_SECONDS` (30) mixing list documents, hybrid search, cited answers
and streaming chat (3:3:3:1). Fails (exit 1) on more than 1% errors or a p95 over its limit
(250 / 500 / 1000 / 2000 ms); writes `.output/load.json`. The fake model answers at once (chat
streams 4 chunks 150 ms apart), so this measures the API and Postgres, not a vendor. Not in CI
(shared runners make latency noisy). Baseline on the agent sandbox (2026-11-13, 20 users, 20 s):

| Scenario | Requests/s | p50 | p95 | p99 | Errors |
| --- | --- | --- | --- | --- | --- |
| list documents | 75 | 4 ms | 21 ms | 65 ms | 0 |
| hybrid search | 78 | 9 ms | 26 ms | 82 ms | 0 |
| answer with citations | 77 | 16 ms | 46 ms | 137 ms | 0 |
| streaming chat | 27 | 623 ms | 648 ms | 697 ms | 0 |
