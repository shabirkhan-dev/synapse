# Authentication

> **Status:** Live (verification) · Placeholder — token issuing is not built yet.

Protected routes (`/rag/*`, `/chat`) need `Authorization: Bearer <token>`.

- Token: JWT signed with **HS256** using `JWT_SECRET` (min 32 chars; production rejects the
  development default).
- Required claims: `sub` (user id — every query is scoped to it), `sid` (session id); `exp` is
  checked.
- Stateless check: signature + expiry only. A revoked session stays valid until the token expires.

| Error | When |
| --- | --- |
| `401 AUTH_ACCESS_TOKEN_MISSING` | No bearer token |
| `401 AUTH_ACCESS_TOKEN_INVALID` | Bad signature, expired, or missing claims |

Nothing in the repo issues tokens yet; `security/authentication` will own that. For local testing,
sign a token with the same secret (see `apps/api/test/helpers.ts`).
