# Endpoints

> **Status:** Live. Source of truth: `/api/openapi.json`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | — | Liveness (no dependencies) |
| GET | `/api/v1/health/ready` | — | Readiness (checks Postgres); `503` if unreachable |
| POST | `/api/v1/auth/sign-up` | — | Create an account (`email`, `password` 12–128 chars) and a session → `{ user, tokens }`. `409 AUTH_EMAIL_TAKEN` if the email exists (case-insensitive). Body ≤ 4 KB |
| POST | `/api/v1/auth/sign-in` | — | Email + password → `{ user, tokens }`. `401 AUTH_INVALID_CREDENTIALS` for any wrong combination |
| POST | `/api/v1/auth/refresh` | — | `refreshToken` → new `tokens` for the same session; the old refresh token stops working, and replaying it revokes the session. `401 AUTH_REFRESH_TOKEN_INVALID` |
| POST | `/api/v1/auth/sign-out` | Bearer | Revoke the current session (refresh token dies; the access token expires on its own) |
| GET | `/api/v1/auth/me` | Bearer | The signed-in user (`id`, `email`, `createdAt`) |
| POST | `/api/v1/rag/documents` | Bearer | Ingest a document (`title`, `content`, optional `source`, `metadata`): normalize, dedup, chunk, embed, store. Body ≤ 2 MB. `201` new; `200` if you already ingested the same content (existing document returned, nothing re-embedded) |
| GET | `/api/v1/rag/documents` | Bearer | List your documents, newest first |
| DELETE | `/api/v1/rag/documents/{id}` | Bearer | Delete a document and its chunks |
| POST | `/api/v1/rag/query` | Bearer | Top-k search (`query`, optional `topK`): hybrid vector + keyword (RRF) by default, or vector-only with `RAG_SEARCH_MODE=vector`; matches carry `score` and `ranks`. Answers with the chat model unless `answer: false`; answered queries return `citations` (passages the answer cites) and `provenance` (chat model, prompt version, embedding model, chunker version, token usage) |
| POST | `/api/v1/chat` | Bearer | Streaming tool-calling chat (`messages`: AI SDK UI messages, 1–200). Tools: `searchDocuments`, `currentTime` |
| GET | `/api/docs` | — | Scalar API reference |
| GET | `/api/openapi.json` | — | OpenAPI 3.1 document |

`tokens` = `{ tokenType: "Bearer", accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }`.
Send `Authorization: Bearer <accessToken>`; when it expires (15 min), call `/auth/refresh`.
