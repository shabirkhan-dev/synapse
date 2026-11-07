# API conventions

> **Status:** Live.

- **Versioning:** `/{API_PREFIX}/v{API_VERSION}` → `/api/v1`. Breaking change = new version.
- **Contract:** routes defined with `@hono/zod-openapi`; `/api/openapi.json` is the source of truth.
- **Success envelope:**

```json
{ "success": true, "statusCode": 200, "requestId": "req_…", "timestamp": "…", "data": {} }
```

- **Error envelope:**

```json
{ "success": false, "statusCode": 422, "code": "VALIDATION_ERROR", "message": "Request validation failed",
  "requestId": "req_…", "timestamp": "…", "path": "/api/v1/rag/query", "method": "POST", "errors": [] }
```

- **Error codes:** `SCREAMING_SNAKE_CASE`, area-prefixed. Current: `VALIDATION_ERROR`,
  `AUTH_ACCESS_TOKEN_MISSING`, `AUTH_ACCESS_TOKEN_INVALID`, `RAG_DOCUMENT_NOT_FOUND`,
  `RAG_EMPTY_DOCUMENT`, `PAYLOAD_TOO_LARGE`, `CHAT_INVALID_MESSAGES`; unknown routes and errors
  use the same envelope.
- **Request id:** `x-request-id` is reused if it matches `^[A-Za-z0-9._:-]{1,128}$`, otherwise
  `req_<uuid>` is minted; it is echoed in the response header and body and logged.
- **CORS:** allow-list from `CORS_ORIGIN` (comma-separated).
- **Streaming:** `/chat` returns the AI SDK UI message stream over SSE.
