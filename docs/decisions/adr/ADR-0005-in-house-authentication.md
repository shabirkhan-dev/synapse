# ADR-0005: In-house authentication

- Status: Accepted
- Date: 2026-11-07

## Context

`apps/api` verifies HS256 access tokens (`sub`, `sid`), but nothing issues them since the starter's
Nest API was removed. No real user can sign in, and the console's first feature (syn-018) needs
sign-in. Options were: build it ourselves, use a self-hosted auth library (e.g. Better Auth), or use
an external identity provider over OIDC (e.g. Clerk, Auth0, WorkOS).

## Decision

Build authentication **in-house**:

- Users, credentials and sessions live in our Postgres (`@synapse/database` schema).
- `packages/security` owns the logic (password hashing, session and token lifecycle); the API
  `auth` module exposes it over HTTP (sign-up, sign-in, refresh, sign-out).
- Access tokens stay short-lived JWTs carrying `sub` and `sid`, so the existing verifier keeps
  working; sessions are revocable by `sid`.

Exact flows, token lifetimes and storage are designed in syn-017 and reviewed with
`.agents/skills/security-review/`.

## Consequences

- Full control, no vendor cost or lock-in; user data stays in our database.
- We own every security detail (hashing, rate limiting, reset and verification flows); each change
  to auth goes through the security-review checklist.
- Enterprise SSO (SAML/OIDC federation), MFA and passkeys are ours to build when needed.

## Alternatives considered

- Self-hosted library (Better Auth): less code, but a framework-shaped dependency inside our
  layering.
- External identity provider: fastest and SSO-ready, but per-user cost, user data outside our
  database, and switching providers later is work.
