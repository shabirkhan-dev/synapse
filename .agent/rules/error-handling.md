# Rule: error handling

- Throw **typed errors** with a stable `code`, an HTTP-meaningful `statusCode` and a human
  `message`: one `AppError` in apps (built on `SynapseError` from `@synapse/core` in packages).
  Add a subclass only when it behaves differently. Codes, statuses and messages come from shared
  constants.
- Map errors once, at the edge (the API error handler). Domain code does not build HTTP responses.
- Unknown errors become `500 INTERNAL_SERVER_ERROR`; log the stack server-side, never return it.
- No silent catches. Either handle the error meaningfully, or add context and rethrow.
- External calls (LLMs, embeddings, rerankers, DB) get **timeouts**, bounded **retries** with
  backoff for retryable errors, and **circuit breakers / fallbacks** from `packages/reliability` (planned; until then, set them per call).
- Long jobs record failure state so they can resume or be retried idempotently.
