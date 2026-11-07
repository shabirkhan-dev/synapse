# Testing

> **Status:** Live for unit/integration tests in `apps/api` · Planned for `tests/` and evaluation.

| Kind | Where | Run |
| --- | --- | --- |
| Unit | `apps/api/test/*.test.ts` (LLM + embeddings mocked) | `bun run test` |
| Integration (pgvector) | `apps/api/test/rag.repository.integration.test.ts` | set `API_TEST_DATABASE_URL`, then `bun --cwd=apps/api run test` |
| Bash scripts | `scripts/bash/tests/` | `bun run test:scripts` |
| Cross-package e2e/load/chaos/security | `tests/` | Planned |
| Retrieval quality | `packages/evaluation` + `apps/api/src/evaluate.ts` | `DATABASE_URL=… bun run eval:retrieval` (CI: `api` job) |

`bun run preflight` = lint + typecheck + test. CI (`.github/workflows/ci.yml`) runs lint, typecheck,
build, test and an `api` job with a pgvector service (integration test + boot smoke test).
