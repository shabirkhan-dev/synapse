# Security architecture

> **Status:** Partly live.

| Area | Today | Target owner |
| --- | --- | --- |
| Authentication | HS256 JWT bearer (`sub`, `sid`) verified with `JWT_SECRET`; no issuer in repo | `security/authentication` |
| Authorization / tenancy | Every RAG row and query scoped by token `sub` | `security/authorization`, `security/tenancy` |
| Secrets | Env vars, Zod-validated; production rejects dev defaults | `security/secrets` |
| Input limits | Zod validation, 2 MB ingest limit, 200-message chat limit | `guardrails/input` |
| Prompt injection | Not yet | `guardrails/injection-defense` |
| Tool safety | Read-only tools only (`searchDocuments`, `currentTime`) | `guardrails/tools` |
| PII | Not yet | `security/pii` |
| HTTP hardening | `secureHeaders`, CORS allow-list, request ids | `apps/api` |
| Repo hygiene | Secret scan + large-file guard pre-commit; CodeQL + Dependabot | `.github/` |

> Placeholder — threat model, token issuer design and PII policy are still to be written.
