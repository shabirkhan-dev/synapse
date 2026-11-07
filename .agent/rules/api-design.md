# Rule: API design

Details: `docs/api/conventions.md`.

- Base path `/{API_PREFIX}/v{API_VERSION}` (default `/api/v1`). Breaking changes need a new version.
- Routes are declared with `@hono/zod-openapi` `createRoute`; the generated OpenAPI document
  (`/api/openapi.json`) is the contract. Keep schemas, examples and summaries accurate.
- Every JSON response uses the envelope: `{ success, statusCode, requestId, timestamp, data }` or
  the error shape `{ success: false, statusCode, code, message, requestId, timestamp, path, method, errors? }`.
- Error `code`s are `SCREAMING_SNAKE_CASE`, prefixed by area (`AUTH_`, `RAG_`, `CHAT_`).
- Validate every input with Zod; validation failures return `422 VALIDATION_ERROR`.
- Every request has an `x-request-id` (reused when sane, minted otherwise) and it is logged.
- Protected routes use bearer auth; never trust a client-supplied owner id.
- Limit body sizes on write endpoints.
