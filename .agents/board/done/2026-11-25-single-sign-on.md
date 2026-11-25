---
id: syn-094
title: Company single sign-on with OpenID Connect, tested against a fake identity provider
type: feature
from: human
to: all
priority: normal
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: [syn-017, syn-032, syn-084]
branch: main
worktree: none
scope:
  [
    packages/core/src/contracts,
    packages/security/src,
    packages/adapters/src,
    packages/database,
    packages/audit/src,
    apps/api/src,
    apps/console/src,
    tests/e2e,
  ]
allowed_shared: [docs/, .agents/memory, .agents/plans/roadmap.md, .env.example]
created: 2026-11-25
updated: 2026-11-25
---

## What

The last buildable Phase 6 row ("Company SSO — parked: needs an identity provider to test
against"), picked up when the human asked to finalize what is left. Teams sign their people in with
their own identity provider; people land in the team.

## Why / Context

ADR-0005 (in-house auth), ADR-0006 (organizations as tenants), ADR-0007 (cookie sessions). The
blocker was testing: the suites now run a fake OpenID Connect provider.

## Proposal or Ask

ADR-0009. OIDC code flow with PKCE and nonce per team; domains proven by DNS TXT; ID token
verified in `@synapse/security`; HTTP through an SSRF-safe adapter; console settings on the Team
page and an `/sso` sign-in page with a `/sso/callback`.

## Scope

**In scope:** contract, security helpers, adapter, migration 0024, API `sso` module and two
`AuthService` methods, console pages and Team card, tests, docs.

**Out of scope:** SAML, SSO enforcement per domain, SCIM, group → role mapping, IdP-initiated
sign-in, a real provider (none available here).

## Validation

- `bun test` in `packages/security` (oidc 6), `packages/adapters` (oidc client 6, web reader 12
  after the shared-request refactor)
- `apps/api`: `test/sso.test.ts` (6), full suite 201 pass; `test/sso.integration.test.ts` (4) on
  Postgres
- `apps/console`: `test/sso.test.tsx` (7), full suite 128 pass
- `bun run test:e2e`: `specs/sso.spec.ts` (2: set up → verify → a new person signs in through the
  fake provider in another browser and lands in the team; an unconfigured domain) and the axe spec
  with `/sso`; full suite run before commit
- lint, format, typecheck, `architecture:check`

## Resolution

- `@synapse/core`: `OidcClient` contract + `OIDC_ERROR_CODES`.
- `@synapse/security`: `createPkce`, `createOidcNonce`, `authorizationUrl`, `verifyIdToken` (jose,
  asymmetric algorithms only); permission `sso.manage` (owners).
- `@synapse/adapters/oidc`: `createOidcClient`; the web reader's SSRF checks and IP pinning moved
  to `web/public-request.ts` and are shared.
- Migration `0024_single_sign_on`: `sso_connections`, `sso_domains` (partial unique index on
  verified domains), `sso_login_states`.
- API module `sso`: `GET|PUT|DELETE /sso/connection`, `POST /sso/connection/verify`,
  `POST /auth/sso/start`, `POST /auth/sso/callback`; `AuthService.ssoAccount` /
  `startSsoSession`; `startSession` can start in an organization; `smallBody` shared;
  `SSO_ALLOW_PRIVATE_NETWORKS` (tests only, refused in production).
- Console: "Use single sign-on" on sign-in, `/sso`, `/sso/callback`, Single sign-on card on the
  Team page (owners edit, admins read; DNS record, callback URL, domain states, turn off with
  confirmation). Auth links are 24px targets now (axe found it with three links).
- e2e: fake OIDC provider (`support/fake-identity-provider.ts`) on the fake model server.

Security review (`skills/security-review`): asymmetric ID token algorithms only; tenancy from the
verified token and verified domains; Zod + 4 KiB bodies on the public routes; client secret sealed
and never returned; `SSO_ALLOW_PRIVATE_NETWORKS` refused in production. It found one gap, fixed
here: the state was not tied to the browser (login CSRF); it now needs the `synapse_sso` cookie set
at the start (test: a callback without it is `400 SSO_STATE_INVALID`).

Not done: trying a real provider (Okta/Entra/Google/Keycloak), SAML.
