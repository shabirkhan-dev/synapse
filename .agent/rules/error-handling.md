# Rule: error handling

- Throw **typed errors** with a stable `code`, an HTTP-meaningful `statusCode` and a human
  `message` (`AppError` today; `core/errors` once `core` exists).
- Map errors once, at the edge (the API error handler). Domain code does not build HTTP responses.
- Unknown errors become `500 INTERNAL_SERVER_ERROR`; log the stack server-side, never return it.
- No silent catches. Either handle the error meaningfully, or add context and rethrow.
- External calls (LLMs, embeddings, rerankers, DB) get **timeouts**, bounded **retries** with
  backoff for retryable errors, and **circuit breakers / fallbacks** from `packages/reliability` (planned; until then, set them per call).
- Long jobs record failure state so they can resume or be retried idempotently.
