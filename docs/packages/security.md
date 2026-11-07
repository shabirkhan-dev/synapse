# `@synapse/security`

Who you are and what you may do: authentication, authorization, tenancy, permissions, PII and secrets.

> **Status:** Live (authentication: passwords, access tokens, refresh tokens) · Planned
> (authorization, tenancy beyond owner scoping, permissions, PII, secrets). Decision: ADR-0005.

## Internal modules

`authentication/ authorization/ tenancy/ permissions/ pii/ secrets/`

## Owns

- Token issuing and verification
- Authorization and permission checks
- Tenant isolation
- PII detection and redaction
- Secret handling

## Does not own

- Content policies (→ `guardrails`)

## Depends on

`core` (+ `jose` for JWTs; passwords and hashing use Bun's built-ins)

## Public API

| Export | What it does |
| --- | --- |
| `hashPassword(password)`, `verifyPassword(password, hash)` | Argon2id via `Bun.password`; the hash string carries salt and parameters |
| `verifyPasswordAgainstNothing(password)` | Same cost as a real check, always `false`: sign-in timing does not reveal which emails exist |
| `PASSWORD_POLICY` | 12–128 characters |
| `createAccessTokens({ secret, ttlSeconds })` → `{ issue, verify }` | HS256 JWTs with `sub` (user) + `sid` (session); `verify` pins the algorithm and throws `SynapseError` `AUTH_ACCESS_TOKEN_INVALID` |
| `createRefreshToken()`, `hashRefreshToken(token)` | 256-bit random base64url token; SHA-256 hex for storage |
| `SECURITY_ERROR_CODES` | Error codes thrown by the package |

## How the API uses it

`apps/api/src/modules/auth` (routes → `AuthService` → `DrizzleAuthRepository`; tables `users`,
`auth_sessions` in `@synapse/database`):

- **Sign-up / sign-in** create a session row and return a 15-minute access token plus a refresh
  token (session lives 30 days; `AUTH_ACCESS_TOKEN_TTL_SECONDS`, `AUTH_SESSION_TTL_DAYS`).
- **Refresh** rotates the refresh token (compare-and-swap on the stored hash, so a race has one
  winner) and keeps the session's expiry. Presenting the *previous* token again revokes the session:
  someone copied it.
- **Sign-out** revokes the session; its refresh token stops working at once.
- **Access tokens are checked by signature and expiry only**, not against the session, so after
  sign-out an access token keeps working until it expires (at most 15 minutes).
- Emails are trimmed and lowercased; sign-in returns one message for unknown emails and wrong
  passwords. Only hashes are stored (password: Argon2id; refresh token: SHA-256).
