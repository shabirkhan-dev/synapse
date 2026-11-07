# Rule: testing

- Every behaviour change ships with a test: success path, rejection path, and the failure path
  that matters (timeouts, retries, partial failure).
- **Unit tests** live next to the package (`test/` or `*.test.ts`) and mock LLMs, embeddings and
  network. Use the AI SDK mocks (`ai/test`) for model calls.
- **Integration tests** hit real Postgres + pgvector and are opt-in via an env URL
  (`API_TEST_DATABASE_URL`). CI runs them in the `api` job.
- **Cross-package tests** (e2e, load, chaos, security, evaluation) go in root `tests/` (planned).
- Quality of AI behaviour is measured by **evaluation** (`packages/evaluation`, planned), not by asserting
  exact model text.
- Never skip, disable or loosen a test to get green. Fix the cause.
- Run `bun run preflight` (lint + typecheck + test) before pushing.
