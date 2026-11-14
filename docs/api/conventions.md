# API conventions

> **Status:** Live.

- **Versioning:** `/{API_PREFIX}/v{API_VERSION}` → `/api/v1`. Breaking change = new version.
- **Contract:** routes defined with `@hono/zod-openapi`; `/api/openapi.json` is the source of truth.
- **Success envelope:**

```json
{ "success": true, "statusCode": 201, "message": "Document ingested", "data": { "id": "…" },
  "requestId": "req_…", "timestamp": "…" }
```

- **Error envelope:**

```json
{ "success": false, "statusCode": 422, "message": "Request validation failed",
  "error": { "code": "VALIDATION_ERROR", "details": [{ "path": "query", "code": "too_small", "message": "…" }] },
  "requestId": "req_…", "timestamp": "…", "path": "/api/v1/rag/query", "method": "POST" }
```

- **`message`** is human-readable and may change; **`error.code`** is stable — branch on the code,
  never on the message. `error.details` appears only when there is structured detail.

- **Error codes:** `SCREAMING_SNAKE_CASE`, area-prefixed. Current: `VALIDATION_ERROR`,
  `AUTH_ACCESS_TOKEN_MISSING`, `AUTH_ACCESS_TOKEN_INVALID`, `RAG_DOCUMENT_NOT_FOUND`,
  `RAG_EMPTY_DOCUMENT`, `PAYLOAD_TOO_LARGE`, `CHAT_INVALID_MESSAGES`; unknown routes and errors
  use the same envelope. A model or email provider that is down returns `503
  RELIABILITY_CIRCUIT_OPEN`; one that did not answer in time returns `504 RELIABILITY_TIMEOUT`
  (both safe to retry later).
- **Request id:** `x-request-id` is reused if it matches `^[A-Za-z0-9._:-]{1,128}$`, otherwise
  `req_<uuid>` is minted; it is echoed in the response header and body and logged.
- **Body size:** every request body is capped at 2 MiB (`requestBodyLimit`, the largest document
  upload); auth routes allow 4 KiB. Over the limit → `413 PAYLOAD_TOO_LARGE`.
- **Rate limits:** auth routes have their own (`docs/packages/security.md`). Routes that call a
  model have per-user budgets (Postgres fixed windows, shared by every instance): questions
  (`POST /chat`, `POST /rag/query`) `RATE_LIMIT_QUESTIONS_PER_MINUTE` (20), ingests
  (`POST /rag/documents`, `/upload`) `RATE_LIMIT_INGESTS_PER_HOUR` (200), evaluation runs
  `RATE_LIMIT_EVALUATION_RUNS_PER_HOUR` (10). Over budget → `429 RATE_LIMITED` with `Retry-After`
  and `details: [{ retryAfterSeconds }]`, before any model call.
- **CORS:** allow-list from `CORS_ORIGIN` (comma-separated).
- **Streaming:** `/chat` returns the AI SDK UI message stream over SSE.
