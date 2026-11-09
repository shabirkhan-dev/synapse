---
id: syn-037
title: Console auth pages: sign up, verify email, reset password; tokens behind an httpOnly cookie
type: feature
from: pm
to: web
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-018]
branch: main
worktree: none
scope: [apps/console, apps/api/src/modules/auth, apps/api/src/config, apps/api/src/app.ts]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

Verification and password-reset emails link to console pages (`/verify-email`, `/reset-password`)
that do not exist, and there is no sign-up page. Sign-in exists (syn-018) but keeps tokens in
`sessionStorage`, readable by page scripts.

## Why / Context

Auth is complete in the API (syn-017, syn-026); users need the pages the emails point to.

## Proposal or Ask

Extend `features/auth` (syn-018 pattern): sign-up, verify-email (token from the link),
forgot/reset password, Zod-validated forms with `@synapse/ui`. Decide (ADR) and implement moving
the refresh token into an httpOnly cookie via a same-origin Next route handler (BFF), so page
scripts never see it.

## Scope

**In scope:**

- auth feature, token handling in `lib/api`, Playwright checks

**Out of scope:**

- organization switching UI (later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- browser check of each flow against a local API (`browser-ui-test` skill)

## Resolution

Done in commit `feat(auth): console sign-up, verify and reset pages with an httpOnly refresh cookie`. Decision: ADR-0007.

- **Design change from the card:** no BFF. The API rate-limits sign-up/sign-in/reset per client IP; proxied through the console every user would share its IP (10 sign-ups an hour in total), and trusting `x-forwarded-for` from it would let direct callers spoof. Instead the API sets the cookie itself and the browser keeps calling the API directly.
- API: `session: "cookie"` on sign-up/sign-in → `synapse_refresh` (`HttpOnly; SameSite=Strict; Path=/api/v1/auth`, `Secure` in production / `AUTH_COOKIE_SECURE`) and no refresh token in the body; `/auth/refresh` with `{}` uses and rotates the cookie (reuse still revokes; a dead cookie is cleared, an outage keeps it); sign-out clears it; CORS `credentials: true`; `CORS_ORIGIN=*` refused at startup. Body transport unchanged for other clients. Route-layer only (`routes/session-cookie.ts`); the service is untouched.
- Console: access token in memory only (nothing in web storage); `restoreSession` on load; refreshes serialized per tab and across tabs (Web Locks); unreachable API during refresh keeps a signed-in tab signed in. New pages: sign-up (policy + repeat), forgot password (same answer either way), reset password and verify email (token read server-side, `no-referrer`, spent once even under StrictMode, removed from the address bar). Shared `FormField`, `AuthCard`, `LinkButton`, `lib/forms/validate-form`.
- **Validation:** 7 API cookie tests (attributes, body omits token, rotation, replay → revoked + cleared, form-encoded cross-site refresh refused, no token → 401, sign-out clears, body mode unchanged, CORS credentials for the console only) + config tests (Secure default, override, `*` refused); 24 console tests (client: cookie refresh with `{}` and credentials, one refresh for concurrent 401s, failed refresh signs out, outage keeps the session, nothing in storage; forms; verify spends the token once under StrictMode). Browser run against the built API (emails from the dev log): sign-up → documents; cookie httpOnly/Strict/path and nothing readable in storage or `document.cookie`; reload restores; two tabs reloading together ×3 stay signed in; verify link confirms and leaves no token in the URL; sign-out clears the cookie; forgot → reset → reused link refused → old password refused, new one works; no page errors. Security review checklist done (tokens, tenancy, input, data, secrets).
- **Not done:** "resend verification" button, session list / sign-out everywhere, committed e2e suite (syn-039).
