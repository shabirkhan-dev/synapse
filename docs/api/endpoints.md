# Endpoints

> **Status:** Live. Source of truth: `/api/openapi.json`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | — | Liveness (no dependencies) |
| GET | `/api/v1/health/ready` | — | Readiness (checks Postgres); `503` if unreachable |
| POST | `/api/v1/auth/sign-up` | — | Create an account (`email`, `password` 12–128 chars, optional `session: "cookie"`) and a session → `{ user, tokens }`; emails a verification link. `409 AUTH_EMAIL_TAKEN` if the email exists (case-insensitive). 10/hour per IP. Body ≤ 4 KB |
| POST | `/api/v1/auth/sign-in` | — | Email + password (optional `session: "cookie"`) → `{ user, tokens }`. `401 AUTH_INVALID_CREDENTIALS` for any wrong combination. 10 per 15 min per email, 100 per IP |
| POST | `/api/v1/auth/refresh` | — | `refreshToken` (or, with an empty JSON body, the `synapse_refresh` cookie) → new `tokens` for the same session; the old refresh token stops working, and replaying it revokes the session — except within `AUTH_REFRESH_REUSE_GRACE_SECONDS` (10 s) of the rotation, which returns an access token only (no `refreshToken`, no cookie change). `401 AUTH_REFRESH_TOKEN_INVALID` (a dead cookie is cleared) |
| POST | `/api/v1/auth/verify-email` | — | `token` from the emailed link → verified `user`. `400 AUTH_LINK_INVALID` if invalid, expired (24 h) or used |
| POST | `/api/v1/auth/verify-email/resend` | Bearer | `202`: emails a new link (older links stop working), or says the email is already verified. 5/hour |
| POST | `/api/v1/auth/password/forgot` | — | `email` → always `202` with the same message; emails a reset link (1 h) only if the account exists. 5/hour per email, 20/hour per IP |
| POST | `/api/v1/auth/password/reset` | — | `token` + new `password` → password changed, email marked verified, **every session signed out**. `400 AUTH_LINK_INVALID` |
| POST | `/api/v1/auth/sign-out` | Bearer | Revoke the current session (refresh token dies, cookie cleared; the access token expires on its own) |
| POST | `/api/v1/auth/switch-organization` | Bearer | `organizationId` you belong to → new access token for it (`org` claim); the session's refreshes keep it. `404` if not a member |
| GET / POST | `/api/v1/organizations` | Bearer | Your organizations with your role (personal first) / create a team (you are owner) |
| GET / POST | `/api/v1/organizations/{id}/members` | Bearer | Members / add an existing account by email or change a role (`member`, `admin`, `owner`); admins only, owners for admin/owner |
| DELETE | `/api/v1/organizations/{id}/members/{userId}` | Bearer | Remove a member (access ends on their next request); never the last owner (`409`) |
| GET | `/api/v1/auth/me` | Bearer | The signed-in user (`id`, `email`, `emailVerifiedAt`, `createdAt`) and `organization: { id, role }`: the organization the token acts in and the role read on this request |
| POST | `/api/v1/rag/documents` | Bearer | Ingest a document (`title`, `content`, optional `source`, `metadata`): normalize, dedup, chunk, embed, store. Body ≤ 2 MB. `201` new; `200` if you already ingested the same content (existing document returned, nothing re-embedded) |
| GET | `/api/v1/rag/documents` | Bearer | List your documents, newest first |
| POST | `/api/v1/rag/documents/purge` | Bearer | Ask to delete **all** your documents: `202` with a pending approval request; nothing is deleted until it is approved |
| GET | `/api/v1/oversight/approvals` | Bearer | Your pending approval requests (newest first, ≤ 50) |
| POST | `/api/v1/oversight/approvals/{id}/approve` | Bearer | Approve: the paused action runs (resumable across restarts) → `{ approval, outcome: { status: "done", result } }`. Repeating is safe; `409` if it was rejected |
| POST | `/api/v1/oversight/approvals/{id}/reject` | Bearer | Reject (`reason?`): the action never runs. `409` if it was approved |
| POST | `/api/v1/oversight/feedback` | Bearer | Rate an answer: `{ requestId, rating: "up" \| "down", comment? }`; one per request, re-rating replaces it |
| DELETE | `/api/v1/rag/documents/{id}` | Bearer | Delete a document and its chunks |
| POST | `/api/v1/rag/query` | Bearer | Top-k search (`query`, optional `topK`): hybrid vector + keyword (RRF) by default, or vector-only with `RAG_SEARCH_MODE=vector`; matches carry `score` and `ranks` (`rerank` when `AI_RERANK_PROVIDER` is set and the reranker answered; `score` is then the reranker's). Answers with the chat model unless `answer: false` (an answer that cites no passage is regenerated once with a stricter prompt); answered queries return `citations` (passages the answer cites) and `provenance` (chat model, prompt version, embedding model, chunker version, `reranker` when one ordered the passages, token usage) |
| POST | `/api/v1/chat` | Bearer | Streaming tool-calling chat. Stateless: `{ messages }` (AI SDK UI messages, 1–200). Stored: `{ message, conversationId? }`; the server replays the history and saves the reply; new conversations return `x-conversation-id`. Remembered facts relevant to the message are added as data. Tools: `searchDocuments`, `rememberFact`, `currentTime` |
| GET | `/api/v1/memory/conversations` | Bearer | Your conversations, most recently active first |
| GET / DELETE | `/api/v1/memory/conversations/{id}` | Bearer | A conversation with its messages / delete it |
| GET / POST | `/api/v1/memory/facts` | Bearer | Facts the assistant remembers about you / remember one (`content` ≤ 500; same text stored once) |
| DELETE | `/api/v1/memory/facts/{id}` | Bearer | Forget one fact |
| DELETE | `/api/v1/memory` | Bearer | Delete all your conversations and facts → `{ conversations, facts }` |
| GET | `/api/v1/audit/events` | Bearer | Your event history, newest first (`limit` ≤ 200, optional `action`): answers with provenance, ingests, deletes, auth and approval events; personal data in `data` is redacted |
| GET | `/api/docs` | — | Scalar API reference |
| GET | `/api/openapi.json` | — | OpenAPI 3.1 document |

`tokens` = `{ tokenType: "Bearer", accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }`.
Send `Authorization: Bearer <accessToken>`; when it expires (15 min), call `/auth/refresh`.

**Cookie transport (the console, ADR-0007):** `session: "cookie"` on sign-up / sign-in sets
`synapse_refresh` (`HttpOnly; SameSite=Strict; Path=/api/v1/auth`, `Secure` in production or with
`AUTH_COOKIE_SECURE=true`) and leaves `refreshToken`/`refreshTokenExpiresAt` out of `tokens`; cookie
refreshes rotate the cookie the same way. Browsers must call with `credentials: "include"`; CORS
allows credentials for `CORS_ORIGIN` only (`*` is refused at startup). A cookie refresh needs a JSON
body, so other sites cannot trigger one without a preflight.
Rate-limited calls return `429 AUTH_RATE_LIMITED` with `error.details[0].retryAfterSeconds`.
Unverified users can still sign in: `user.emailVerifiedAt` is `null` until they open the link, and
clients decide what to gate on it.
Documents, search, answers and approval requests belong to the **active organization** (the token's
`org`, or your personal one). Conversations, memory and feedback stay yours. Admins and owners
decide approvals (`403 OVERSIGHT_FORBIDDEN` for members) and see the whole audit history; members
see their own requests and events.
