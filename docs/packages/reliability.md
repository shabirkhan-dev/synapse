# `@synapse/reliability`

Make external calls dependable: timeouts, retries with backoff, circuit breakers and fallbacks.

> **Status:** Live (timeouts, retry, circuit breakers, call policies, model gateway with chat
> fallback; used by the api for models and email, and by the worker for embeddings) · Planned
> (idempotency keys, health checks for every dependency, breaker state shared across processes).

## Internal modules

`timeouts/ retry/ circuit-breakers/ policies/ gateways/`

## Owns

- Per-attempt timeouts
- Retry with exponential backoff and full jitter, retryable errors only
- Circuit breakers (closed → open → half-open)
- Fallbacks (a second chat model)

## Does not own

- Job retries (→ `adapters/queue`, pg-boss) · rate limiting (→ API `auth` module)
- Choosing providers (→ `providers`, syn-034)

## Depends on

`core` (contracts, `SynapseError`). No vendor SDKs: provider errors are read by shape.

## Public API

| Export | What it does |
| --- | --- |
| `withTimeout(call, { timeoutMs, signal?, name? })` | `call(signal)` with a deadline; rejects with `RELIABILITY_TIMEOUT` (retryable) even if the call ignores its signal; a caller abort passes through |
| `retry(call, { attempts, baseDelayMs, maxDelayMs, isRetryable?, sleep?, random?, signal?, onRetry? })` | Retries retryable errors; delay = `random() × min(max, base × 2^(n-1))` |
| `isRetryableError(error)` | `retryable`/`isRetryable` flag, else status 408/409/425/429/5xx, else network `TypeError`, else one level of `cause`; open circuits, aborts and other 4xx are final |
| `createCircuitBreaker({ name, failureThreshold, resetAfterMs, isFailure?, now?, onStateChange? })` | Opens after N consecutive failures (retryable errors by default, so a 400 does not count); fails fast with `RELIABILITY_CIRCUIT_OPEN`; one trial call when half-open |
| `createCallPolicy({ name, timeoutMs?, retry, breaker, onEvent?, now?, sleep?, random? })` | retry → breaker → timeout per attempt; retries stop once the circuit opens |
| `withModelReliability(gateway, { chatTimeoutMs, embeddingTimeoutMs, retry, breaker, fallbackChat?, onEvent? })` | Same `ModelGateway` with one policy for chat and one for embeddings; chat falls back to `fallbackChat` when the primary's retries run out or its circuit is open (not for a 400 or a caller abort); the result names the model that answered |
| `RELIABILITY_ERROR_CODES` | `TIMEOUT`, `CIRCUIT_OPEN` |
| `ReliabilityEvent` | `retry` · `circuit` (from/to) · `fallback`: apps log them and add span events |

## How the apps use it

```ts
instrumentModelGateway(                        // one span per logical call
  withModelReliability(rawGateway, {           // each attempt inside it
    ...config.reliability, fallbackChat, onEvent: reportReliabilityEvent(logger),
  }), { logger, prices })
```

- **api:** `infrastructure/models/create-model-gateway.ts`; email retries 429/5xx/network
  failures behind an `email` breaker (`infrastructure/email`). The error handler maps
  `RELIABILITY_CIRCUIT_OPEN` → `503` and `RELIABILITY_TIMEOUT` → `504`.
- **api, reranker:** one attempt within `AI_RERANK_TIMEOUT_MS` behind a `rerank` breaker; retrieval
  falls back to the fused order, so a retry would only add latency.
- **worker:** embeddings for re-embedding; a batch that still fails fails the job attempt, pg-boss
  retries the job and the checkpoint resumes it.
- Gateway calls in `@synapse/adapters` make one attempt (`maxRetries: 0`), so retries are not
  multiplied.
- Config: `AI_CHAT_TIMEOUT_MS`, `AI_EMBEDDING_TIMEOUT_MS`, `AI_RETRY_ATTEMPTS`,
  `AI_CIRCUIT_FAILURE_THRESHOLD`, `AI_CIRCUIT_RESET_MS`, `AI_FALLBACK_CHAT_MODEL` (root
  `.env.example`). Backoff is 250 ms doubling to 4 s.

## Limits

- Breaker state is per process (each api replica learns on its own).
- Streaming chat (`/chat`, `chatModel`) uses the AI SDK's own retries (2); no timeout, breaker or
  fallback yet: it needs a streaming contract.
- `Retry-After` headers are not read; backoff is fixed by config.
