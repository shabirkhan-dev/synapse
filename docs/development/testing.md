# Testing

> **Status:** Live (unit and integration tests in every package and app, console component tests,
> browser e2e in `tests/e2e`, retrieval evaluation) · Planned (load, chaos and security suites).

| Kind | Where | Run |
| --- | --- | --- |
| Unit | `apps/api/test/*.test.ts` (LLM + embeddings mocked) | `bun run test` |
| Integration (pgvector) | `apps/api/test/rag.repository.integration.test.ts` | set `API_TEST_DATABASE_URL`, then `bun --cwd=apps/api run test` |
| Bash scripts | `scripts/bash/tests/` | `bun run test:scripts` |
| Console unit/component | `apps/console/test/` (Bun + happy-dom + Testing Library, `fetch` mocked) | `bun --cwd=apps/console test` |
| Browser e2e (console + API) | `tests/e2e/specs/` (Playwright 1.63, Chromium) | `E2E_DATABASE_URL=… bun run test:e2e` (CI: `e2e` job) |
| Load / chaos / security | `tests/` | Planned |
| Retrieval quality | `packages/evaluation` + `apps/api/src/evaluate.ts` | `DATABASE_URL=… bun run eval:retrieval` (CI: `api` job) |

`bun run preflight` = lint + typecheck + test. CI (`.github/workflows/ci.yml`) runs lint, typecheck,
build, test and an `api` job with a pgvector service (integration test + boot smoke test).

## Browser e2e (`tests/e2e`)

`bun run test:e2e` starts three servers on their own ports (so it never collides with
`bun run dev`): a fake OpenAI-compatible model provider (`:5601`, deterministic embeddings and one
cited answer), the API from source (`:8100`, development mode, so emails are written to its log),
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

Debug a failure: `bun run test:e2e -- --trace on -g "<test name>"`, then open
`tests/e2e/.output/results`. Locally a running console on `:3100` is reused (stop it after
changing console code); in CI every server starts fresh and failures upload `.output/`.
