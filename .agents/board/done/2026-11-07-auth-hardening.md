---
id: syn-026
title: Harden auth: rate limits, email verification, password reset
type: risk
from: reviewer
to: backend
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-017]
branch: main
worktree: none
scope: [packages/security, apps/api/src/modules/auth, packages/database]
allowed_shared: []
created: 2026-11-07
updated: 2026-11-07
---

## What

syn-017 shipped sign-up/sign-in/refresh/sign-out without brute-force protection or account recovery.

## Why / Context

Found in the syn-017 security review. Before real users: sign-in can be guessed at full speed,
nobody can prove they own their email, and a forgotten password locks the account forever.

## Proposal or Ask

1. Rate limit sign-in and sign-up per email and per client IP (Postgres-backed so it works across
   instances; trust `x-forwarded-for` only behind a configured proxy).
2. Email verification and password reset with single-use, hashed, expiring tokens; needs an email
   adapter (`adapters/` contract, provider in `providers/`).
3. Optional later: list and revoke sessions, MFA (TOTP / passkeys), organizations (tenancy).

## Scope

**In scope:**

- limits, verification, reset, their tables and endpoints

**Out of scope:**

- SSO, organizations (own cards)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- tests: limit hit returns 429; reset token works once and expires
- `.agents/skills/security-review/` checklist

## Resolution

Done in commit `feat(auth): add rate limits, email verification and password reset`. Email provider: **Resend** (human decision).

- `@synapse/core/contracts`: `EmailSender`. `@synapse/adapters/email`: `createResendEmailSender` over Resend's HTTP API (no SDK), 10 s timeout, `EMAIL_SEND_FAILED` with the provider's reason; 3 tests. API `infrastructure/email/`: Resend when `RESEND_API_KEY` is set, otherwise logs the email (development; production config requires the key).
- `@synapse/security`: `createSecretToken` / `hashSecretToken` (generalized from refresh tokens).
- Migration `0005`: `users.email_verified_at`, `auth_tokens` (purpose, SHA-256 hash, expiry, used_at), `auth_rate_limits` (hashed key, window, attempts).
- Rate limits (fixed windows, one Postgres upsert): sign-in 10/15 min per email + 100 per IP, sign-up 10/h per IP, reset requests 5/h per email + 20 per IP, verification emails 5/h per user; `429 AUTH_RATE_LIMITED` with `retryAfterSeconds`. Client IP: socket, or last `x-forwarded-for` hop with `TRUST_PROXY=true`.
- Endpoints: `POST /auth/verify-email`, `/auth/verify-email/resend` (bearer), `/auth/password/forgot`, `/auth/password/reset`. Links are single-use (CAS), expire (24 h / 1 h), and a new one voids the old. Reset marks the email verified and revokes every session.
- Tests: 8 recovery/limit flow tests, 3 more Postgres integration tests (concurrent rate-limit hits count exactly; concurrent link use has one winner; expiry; voiding). Real-server smoke without a Resend key: sign-up 201 → link from log → verify 200 → forgot 202 → reset 200 → sign-in 200 → 11 attempts: 9×401 then 429 (the successful sign-in counted too).

**Security review:** 1) tokens/secrets unchanged, links are 256-bit and stored hashed; 2) every action is scoped to the verified `sub` or to the user the link belongs to; 3) Zod + 4 KB limits on all new bodies; 4) n/a; 5) rate-limit keys hashed (no raw email/IP stored); the development log sender logs the email text including the link: development only; 6) `RESEND_API_KEY` documented in `.env.example`, never committed.

**Not done / follow-ups:** real delivery not tested (no `RESEND_API_KEY` yet); pruning old `auth_rate_limits` / used `auth_tokens` rows (worker, syn-024); console pages for the links (syn-018); MFA, session list, organizations (later cards).
