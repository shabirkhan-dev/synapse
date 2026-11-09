# `@synapse/security`

Who you are and what you may do: authentication, authorization, tenancy, permissions, PII and secrets.

> **Status:** Live (authentication: passwords, access tokens, refresh tokens; PII redaction) ·
> Planned (authorization, tenancy beyond owner scoping, permissions, PII detection beyond patterns). Decision: ADR-0005.

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
| `createAccessTokens({ secret, ttlSeconds })` → `{ issue, verify }` | HS256 JWTs with `sub` (user) + `sid` (session) + optional `org` (active organization, absent = personal); `verify` pins the algorithm and throws `SynapseError` `AUTH_ACCESS_TOKEN_INVALID` |
| `createSecretToken()`, `hashSecretToken(token)` | 256-bit random base64url token (refresh tokens, emailed links); SHA-256 hex for storage |
| `redactPii(text)`, `redactPiiDeep(value)` | Replace emails, phone and card numbers, JWTs, bearer tokens and provider keys (`sk-`, `pk-lf-`, `re_`, `dp.st.`, `ghp_`, `AKIA`) with `[email]` / `[phone]` / `[card]` / `[secret]`; `Deep` walks objects and arrays (used before audit writes) |
| `ORGANIZATION_ROLES`, `OrganizationRole`, `PERMISSIONS`, `can(role, permission)`, `isOrganizationRole` | `owner` ⊇ `admin` ⊇ `member`: members `documents.read/write`, `actions.request`; admins `approvals.decide`, `audit.read_all`, `members.manage`; owners `members.manage_admins` |
| `SECURITY_ERROR_CODES` | Error codes thrown by the package |

## How the API uses it

`apps/api/src/modules/auth` (routes → `AuthService` → `DrizzleAuthRepository` + `DrizzleRateLimiter`; tables `users`,
`auth_sessions`, `auth_tokens`, `auth_rate_limits` in `@synapse/database`; email through the
`EmailSender` contract, Resend in `@synapse/adapters/email`):

- **Sign-up / sign-in** create a session row and return a 15-minute access token plus a refresh
  token (session lives 30 days; `AUTH_ACCESS_TOKEN_TTL_SECONDS`, `AUTH_SESSION_TTL_DAYS`).
- **Refresh** rotates the refresh token (compare-and-swap on the stored hash, so a race has one
  winner) and keeps the session's expiry. Presenting the *previous* token again revokes the session:
  someone copied it.
- **Sign-out** revokes the session; its refresh token stops working at once.
- **Browsers (the console)** take the refresh token as an httpOnly cookie instead of in the body
  (`session: "cookie"`, ADR-0007) and keep the access token in memory; the API route layer moves
  the token into the cookie, the service is unchanged.
- **Access tokens are checked by signature and expiry only**, not against the session, so after
  sign-out an access token keeps working until it expires (at most 15 minutes).
- Emails are trimmed and lowercased; sign-in returns one message for unknown emails and wrong
  passwords. Only hashes are stored (password: Argon2id; refresh and link tokens: SHA-256).
- **Rate limits** (fixed windows in Postgres, one upsert per hit, so every instance shares them):
  sign-in 10 per 15 min per email and 100 per IP; sign-up 10/hour per IP; reset requests 5/hour per
  email and 20 per IP; verification emails 5/hour per user. Counted **before** any password work.
  Keys are SHA-256 of `scope:value`, so the table holds no raw emails or IPs. Client IP is the
  socket address, or the last `x-forwarded-for` entry when `TRUST_PROXY=true` (one proxy hop).
- **Emailed links** (`APP_URL` + `/verify-email` or `/reset-password` + `?token=`) are single-use
  (consumed by compare-and-swap), expire (verification 24 h, reset 1 h), and a new link voids the
  previous one. A password reset marks the email verified and signs out every session.
- **No account enumeration on reset:** same `202` either way, and the email is sent in the
  background so timing does not differ. Sign-up still answers `409` for a taken email.
- Email send failures are logged and do not fail the request; the user can ask again.

## Organizations (tenancy)

ADR-0006. The API's `organizations` module stores organizations and members (`organizations`,
`organization_members`); the auth middleware sets `user.orgId` (token `org`, or the personal one)
and `user.role` (read from the database on every request; not a member → `401 AUTH_NOT_A_MEMBER`).

| Endpoint | Who | What |
| --- | --- | --- |
| `GET /organizations` | anyone | your organizations and role (personal first) |
| `POST /organizations` | anyone | create a team; you are its owner |
| `GET /organizations/{id}/members` | members | members and roles |
| `POST /organizations/{id}/members` | admins (owners for `admin`/`owner`) | add an existing account by email, or change a role |
| `DELETE /organizations/{id}/members/{userId}` | admins (owners for owners) | remove; never the last owner |
| `POST /auth/switch-organization` | members | new access token for that organization; refresh keeps it |

