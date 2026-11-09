# ADR-0007: Console sessions keep the refresh token in an httpOnly cookie set by the API

- Status: Accepted
- Date: 2026-11-09

## Context

The console (syn-018) kept both tokens in `sessionStorage`, where any script on the page can read
them. A stolen refresh token is a 30-day session. The card proposed a same-origin BFF (Next route
handlers proxying auth and holding the cookie), but the API rate-limits sign-up, sign-in and reset
requests per client IP (syn-026): proxied through the console server, every user would share that
server's IP (10 sign-ups an hour for everyone), and trusting `x-forwarded-for` from the console
would let anyone calling the API directly spoof their IP.

## Decision

The API sets the cookie itself; the browser keeps talking to the API directly.

- Sign-in and sign-up take `session: "cookie"`. The response then sets
  `synapse_refresh=<token>; HttpOnly; SameSite=Strict; Path=/api/v1/auth` (`Secure` in production,
  `AUTH_COOKIE_SECURE`), and the body omits `refreshToken`. The default (`"body"`) is unchanged for
  other clients.
- `POST /auth/refresh` without a body token reads the cookie, rotates it like any refresh (reuse →
  session revoked) and clears it when the refresh fails. Cookie refresh requires
  `content-type: application/json`, so a cross-origin page cannot send it without a CORS preflight
  (which only the configured console origins pass) — the CSRF guard on top of `SameSite=Strict`.
- `POST /auth/sign-out` clears the cookie. CORS allows credentials for the configured origins.
- The console keeps only the 15-minute access token, in memory. On load it restores the session
  with a cookie refresh; tabs serialize refreshes with the Web Locks API so two tabs never present
  the same refresh token (which the API would treat as reuse and revoke the session).

## Consequences

- Page scripts never see the refresh token after sign-in, and it is not stored in web storage. A
  script running in the page can still act as the user while the page is open (any browser client
  can be driven by XSS); it cannot carry a long-lived token away.
- Console and API must be on the same site (e.g. `console.example.com` and `api.example.com`, or
  `localhost` on two ports): `SameSite=Strict` cookies are not sent across sites.
- Every page load costs one refresh call; rate limits by IP still see the real client.
- Non-browser clients keep using body tokens.

## Alternatives considered

- BFF route handlers holding the cookie: same browser protection, but breaks per-IP rate limits or
  needs a trusted forwarded-IP channel between console and API.
- Keep tokens in web storage: simplest, long-lived token readable by any injected script.
