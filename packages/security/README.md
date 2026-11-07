# @synapse/security

Who you are: password hashing, access tokens and refresh tokens. No database: the API's `auth`
module stores users and sessions. Full description: [docs/packages/security.md](../../docs/packages/security.md).

```ts
import { createAccessTokens, createRefreshToken, hashPassword, hashRefreshToken } from "@synapse/security";

const passwordHash = await hashPassword(password); // argon2id
const tokens = createAccessTokens({ secret: JWT_SECRET, ttlSeconds: 900 });
const { token } = await tokens.issue({ sub: userId, sid: sessionId });
const refreshToken = createRefreshToken(); // store hashRefreshToken(refreshToken) only
```

| Module | Status |
| --- | --- |
| `authentication/` | Live |
| `authorization/`, `tenancy/`, `permissions/`, `pii/`, `secrets/` | Planned |
