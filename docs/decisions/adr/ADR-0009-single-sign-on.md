# ADR-0009: Single sign-on with OpenID Connect per team, domains proven by DNS

- Status: Accepted
- Date: 2026-11-25

## Context

Companies want their people to sign in with the company's identity provider (Okta, Entra ID,
Google Workspace, Keycloak…) instead of a Synapse password, and to land in the company's team.
Authentication is in-house (ADR-0005) and organizations are the tenants (ADR-0006). The roadmap
row was parked until something could be tested against an identity provider; the suites now run a
fake one. SAML is the other common protocol; every provider above also speaks OpenID Connect.

The danger in SSO is account takeover: whoever controls a provider can assert any email. If a team
could claim `gmail.com` (or a competitor's domain), its provider could sign in as anyone there,
including existing accounts.

## Decision

- **OpenID Connect only** (authorization code flow, PKCE S256, `state` and `nonce`), configured per
  team: issuer, client id, client secret (sealed with `AUTH_ENCRYPTION_KEY` like TOTP secrets), the
  email domains it signs in, and the role people get when they join (`member` or `admin`). One
  connection per team (`sso_connections`), owners change it (`sso.manage`), admins read it.
- **A domain signs people in only once verified**: a DNS TXT record
  `_synapse-verification.<domain>` = `synapse-verification=<token>` (token per connection). A
  domain can be verified by one connection at a time (partial unique index on `sso_domains`).
- Sign-in starts from the email (`POST /auth/sso/start`): its domain picks the connection. The
  state (SHA-256 of the state and a per-browser secret), PKCE verifier and nonce are stored for 10
  minutes and taken once (`sso_login_states`). The per-browser secret lives in an httpOnly
  `SameSite=Strict` cookie (`synapse_sso`, path `/api/v1/auth/sso`), so a callback finished in
  another browser finds nothing (no login CSRF: nobody can be signed into someone else's account by
  a crafted link). The provider sends the browser to the console's `/sso/callback`, which
  posts `code` + `state` to `POST /auth/sso/callback` — the same cookie session as a password
  sign-in (ADR-0007), so nothing new crosses sites.
- The ID token is verified in `@synapse/security` with `jose` (already its dependency): signature by
  the provider's JWK Set with asymmetric algorithms only (`none` and HMAC refused), issuer,
  audience/`azp`, expiry (60 s skew), nonce. Its `email` counts only with `email_verified: true` and
  only in a verified domain of that connection.
- The email decides the account: an existing account with it is signed in (and added to the team if
  not a member, never demoted); otherwise one is created with an unusable random password and the
  email marked verified. The session starts in the team.
- HTTP to providers goes through `@synapse/adapters/oidc` behind an `OidcClient` contract in
  `core`, reusing the web reader's SSRF-safe request (https, public addresses only, pinned IP, no
  redirects, 10 s, 256 KiB). `SSO_ALLOW_PRIVATE_NETWORKS` (tests only; production refuses it) lets
  the suites use the fake provider on `127.0.0.1`.

## Consequences

- No new dependency and no identity-provider SDK; any standards-compliant provider works.
- People signing in this way skip our two-step sign-in (the provider owns MFA). Passwords keep
  working for them too: SSO is not enforced for a domain yet, and a reset link can set a password.
- Turning SSO off keeps accounts and memberships; removing someone from the provider does not end
  their Synapse sessions (no SCIM, no back-channel logout); remove them from the team as well.
- DNS lookups go to the host's resolver (`node:dns`); a team that loses its domain keeps it verified
  until the connection is changed (no periodic re-check).
- Not covered: SAML, enforcing SSO per domain, SCIM provisioning, group-to-role mapping, more than
  one provider per team, IdP-initiated sign-in.
