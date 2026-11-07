# Security architecture

> **Status:** Partly live.

| Area | Today | Target owner |
| --- | --- | --- |
| Authentication | In-house (ADR-0005): email + password (Argon2id), 15-min HS256 access tokens (`sub`, `sid`), rotating refresh tokens with reuse detection, sessions in Postgres | `security/authentication` + API `auth` module (live) |
| Brute-force protection | Not yet: no rate limit on sign-in/sign-up (syn-026) | `reliability` / `apps/api` |
| Account recovery | Not yet: no email verification or password reset (syn-026) | `security/authentication` |
| Authorization / tenancy | Every RAG row and query scoped by token `sub` | `security/authorization`, `security/tenancy` |
| Secrets | Env vars, Zod-validated; production rejects dev defaults | `security/secrets` |
| Input limits | Zod validation, 2 MB ingest limit, 200-message chat limit | `guardrails/input` |
| Prompt injection | Not yet | `guardrails/injection-defense` |
| Tool safety | Read-only tools only (`searchDocuments`, `currentTime`) | `guardrails/tools` |
| PII | Not yet | `security/pii` |
| HTTP hardening | `secureHeaders`, CORS allow-list, request ids | `apps/api` |
| Repo hygiene | Secret scan + large-file guard pre-commit; CodeQL + Dependabot | `.github/` |

Token design: [`docs/packages/security.md`](../packages/security.md#how-the-api-uses-it).

> Placeholder — threat model and PII policy are still to be written.
