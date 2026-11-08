# Security architecture

> **Status:** Partly live.

| Area | Today | Target owner |
| --- | --- | --- |
| Authentication | In-house (ADR-0005): email + password (Argon2id), 15-min HS256 access tokens (`sub`, `sid`), rotating refresh tokens with reuse detection, sessions in Postgres | `security/authentication` + API `auth` module (live) |
| Brute-force protection | Postgres fixed-window rate limits on sign-in, sign-up, reset and verification emails (hashed keys) | API `auth` module (→ `reliability` later) |
| Account recovery | Email verification and password reset via single-use, expiring, hashed links; email via Resend | `security/authentication` + API `auth` module |
| Authorization / tenancy | Every RAG row and query scoped by token `sub` | `security/authorization`, `security/tenancy` |
| Secrets | Env vars, Zod-validated; production rejects dev defaults | `security/secrets` |
| Input limits | Zod validation, 2 MB ingest limit, 200-message chat limit, guardrails input policy (length, blocked terms) | `guardrails/input` (live) |
| Prompt injection | Instruction-like text removed from passages and tool results; prompts frame them as data; facts with instructions refused | `guardrails` (live) |
| Tool safety | Allowlist (`searchDocuments`, `rememberFact`, `currentTime`); privileged actions go through approvals | `guardrails/tools` (live) |
| PII | Pattern redaction (emails, phones, cards, tokens, keys) before audit writes | `security/pii` (live) |
| Audit trail | Append-only `audit_events` (UPDATE rejected by trigger): answers with provenance, ingests, deletes, auth, approvals | `audit` (live) |
| HTTP hardening | `secureHeaders`, CORS allow-list, request ids | `apps/api` |
| Repo hygiene | Secret scan + large-file guard pre-commit; CodeQL + Dependabot | `.github/` |

Token design: [`docs/packages/security.md`](../packages/security.md#how-the-api-uses-it).

> Placeholder — threat model and PII policy are still to be written.
