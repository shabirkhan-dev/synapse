---
id: syn-017
title: Build in-house authentication (access-token issuer)
type: risk
from: human
to: backend
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/security, apps/api/src/modules/auth]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

The API verifies HS256 tokens but nothing issues them since the Nest API was removed.

## Why / Context

No real user can authenticate today; only tests mint tokens.

## Proposal or Ask

**Decided (2026-11-07, human): build it in-house** — ADR-0005. Users, credentials and sessions in our
Postgres; `packages/security` owns the logic; the API `auth` module exposes sign-up, sign-in,
refresh and sign-out. Access tokens stay short-lived JWTs with `sub` + `sid` so the current verifier
keeps working. Design flows and lifetimes, then implement.

## Scope

**In scope:**

- `packages/security/**`, auth module

**Out of scope:**

- authorization/permissions beyond owner scoping

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- `.agents/skills/security-review/` checklist

## Resolution

Done in commit `feat(auth): add in-house sign-up, sign-in, refresh and sign-out`.

- `@synapse/security` (new): Argon2id passwords (`Bun.password`), timing-equal check for unknown emails, HS256 access tokens (`sub` + `sid`, algorithm pinned), 256-bit refresh tokens stored as SHA-256; 7 tests.
- `@synapse/database`: `users` (unique lowercased email) and `auth_sessions` (current + previous refresh-token hash, expiry, revoked_at; cascade on user delete), migration `0004_auth_users_sessions`.
- API `auth` module: `POST /auth/sign-up|sign-in|refresh|sign-out`, `GET /auth/me`. Refresh rotates by compare-and-swap; replaying a rotated token revokes the session. Config `AUTH_ACCESS_TOKEN_TTL_SECONDS` (900), `AUTH_SESSION_TTL_DAYS` (30). Bodies ≤ 4 KB.
- Tests: 8 flow tests (in-memory repo), 3 Postgres integration tests (incl. a concurrent-refresh race), OpenAPI paths. Smoke on the real server: sign-up 201, me 200, wrong password 401, refresh 200, replay 401 and the session revoked in the table.

**Security review** (`.agents/skills/security-review/`):

1. Authentication: HS256 pinned on verify, `none` rejected (test); production still rejects the dev `JWT_SECRET`.
2. Tenancy: `sub` comes only from the verified token; sign-out revokes only the caller's own session (`id` + `user_id`).
3. Input: Zod on every body (email ≤ 254, password 12–128, refresh token ≤ 512), 4 KB body limit.
4. LLM safety: not touched.
5. Data: no email or password in logs or spans (request spans carry route and request id only); only hashes stored.
6. Secrets: no new secrets; the new settings are in `.env.example`.

**Known gaps → syn-026:** no rate limiting on sign-in/sign-up, no email verification or password reset, no MFA, and access tokens stay valid up to 15 min after sign-out (by design, documented).
