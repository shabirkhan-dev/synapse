# Rule: API design

Details: `docs/api/conventions.md`.

- Base path `/{API_PREFIX}/v{API_VERSION}` (default `/api/v1`). Breaking changes need a new version.
- Routes are declared with `@hono/zod-openapi` `createRoute`; the generated OpenAPI document
  (`/api/openapi.json`) is the contract. Keep schemas, examples and summaries accurate.
- Every JSON response uses the envelope:
  `{ success: true, statusCode, message, data, requestId, timestamp }` or
  `{ success: false, statusCode, message, error: { code, details? }, requestId, timestamp, path, method }`.
  `message` is for people; `error.code` is the machine-readable identifier.
- Error `code`s are `SCREAMING_SNAKE_CASE`, prefixed by area (`AUTH_`, `RAG_`, `CHAT_`). Status codes,
  error codes and messages come from shared constants (`HTTP_STATUS`, `ERROR_CODES`,
  `RESPONSE_MESSAGES`) or the module's `constants/` — never inline literals. The message is never the
  machine-readable identifier.
- Responses are built only by the shared helpers (`success`, `failure`) and the error handler.
- Validate every input with Zod; validation failures return `422 VALIDATION_ERROR`.
- Every request has an `x-request-id` (reused when sane, minted otherwise) and it is logged.
- Protected routes use bearer auth; never trust a client-supplied owner id.
- Limit body sizes on write endpoints.

Layering (routes → controllers → services → repositories): `backend-architecture.md`.
