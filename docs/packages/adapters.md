# `@synapse/adapters`

Implement `core` contracts against infrastructure: vector store, cache, queue, storage and the model gateway.

> **Status:** Live (`model-gateway/`) · Planned (vector-store, cache, queue, storage). The database
> client is its own package, [`@synapse/database`](database.md).

## Internal modules

`vector-store/ cache/ queue/ storage/ model-gateway/`

## Owns

- pgvector vector store
- Postgres-backed cache
- pg-boss queue
- Object storage
- Model gateway (routes calls to `providers/*`)

## Does not own

- Domain logic

## Depends on

`core`, `database`, `providers`, vendor SDKs (pg-boss…)

## Public API

| Export | Import | What it does |
| --- | --- | --- |
| `createReranker(spec)`, `createAiSdkReranker({ model, info })`, `createTermOverlapReranker()` | `@synapse/adapters/model-gateway` | `Reranker` on a vendor model (one attempt, `maxRetries: 0`), or the offline word-overlap reranker for evaluations |
| `createModelGateway({ chat, embedding })`, `ModelGatewayOptions` | `@synapse/adapters/model-gateway` | `ModelGateway` from two `@synapse/providers` specs: chat and embeddings can each come from a different vendor |
| `createHashingEmbeddingGateway({ dimensions })` | `@synapse/adapters/model-gateway` | Offline deterministic bag-of-words embeddings (`hashing:bow-v1`) for evals and tests |
| `createAiSdkModelGateway({ chatModel, embeddingModel, chatInfo, embeddingInfo })`, `AiSdkModelGateway` | `@synapse/adapters/model-gateway` | Wrap any AI SDK models (tests pass mocks); also exposes `chatModel`. One attempt per call (`maxRetries: 0`): retries come from `@synapse/reliability` |
| `createPostgresCheckpointer({ connectionString, schema?, onError })` → `{ saver, setup, close }` | `@synapse/adapters/checkpointer` | LangGraph checkpoints in Postgres (`langgraph` schema; `setup()` creates/migrates the tables). `onError` receives a pooled connection that dropped while idle; without a listener `pg` crashes the process (syn-051). Waiting for a connection stops after 5 s (`connectionTimeoutMillis`; `pg` waits forever by default, syn-071) |
| `createWorkerPdfTextExtractor({ workerUrl, timeoutMs })`, `servePdfExtraction()` | `@synapse/adapters/pdf` | Each PDF in its own worker thread (the entry file calls `servePdfExtraction()`), terminated at the deadline → `PDF_TIMEOUT`; a crashed worker → `PDF_UNREADABLE`. The API's worker entry is `src/pdf.worker.ts`, built next to `server.js` |
| `createPdfTextExtractor()` → `PdfTextExtractor` | `@synapse/adapters/pdf` | PDF text per page with `unpdf` 1.9.1 (pdf.js, no native code) in the calling thread, for tests and batch tools; malformed or encrypted files throw `PDF_UNREADABLE` |
| `createWebPageReader({ timeoutMs?, maxBytes?, maxRedirects?, allowPrivateNetworks?, resolve?, fetch? })` → `WebPageReader`; `isPublicAddress`, `htmlToText`, `decodeEntities` | `@synapse/adapters/web` | SSRF-safe page reading (syn-074): http(s) on 80/443 only, no URL credentials; every address the name resolves to (`Bun.dns.lookup`) must be public (`node:net` `BlockList`: loopback, RFC 1918, link-local/metadata, CGNAT, documentation, multicast, reserved, ULA, NAT64, 6to4, Teredo; IPv4-mapped IPv6 by its IPv4 rule); the request goes to the checked IP with the real `Host` header and TLS `serverName`, so DNS rebinding cannot swap the address; redirects followed by hand and re-checked; streamed body capped; HTML → text with Bun's `HTMLRewriter` (`<main>`/`<article>` when present, no nav/scripts/forms/page header/footer, headings → `#`, list items → `- `). `allowPrivateNetworks` is for tests only (the API refuses it in production) |
| `createOidcClient({ timeoutMs?, cacheTtlMs?, allowPrivateNetworks?, resolve?, fetch? })` → `OidcClient` | `@synapse/adapters/oidc` | Single sign-on (syn-094, ADR-0009): discovery (issuer must match exactly), the code exchange (client secret as HTTP Basic + PKCE verifier) and the JWK Set, each through the same SSRF-safe request as the web reader (`createPublicRequest`, https only here, no redirects), 10 s and 256 KiB per call; discovery and keys cached 10 minutes. Codes `OIDC_PROVIDER_NOT_ALLOWED`, `_UNREACHABLE`, `_INVALID_RESPONSE`, `OIDC_CODE_REJECTED`. Verifying the ID token is `@synapse/security`'s job |
| `createPgBossJobQueue({ connectionString, schema?, ssl?, onError })` | `@synapse/adapters/queue` | `JobQueue` on pg-boss 12 (`exclusive`/`standard` policies, retries with backoff, expiry, UTC cron schedules, graceful stop) |
| `createResendEmailSender({ apiKey, from, timeoutMs? })`, `EMAIL_ERROR_CODES` | `@synapse/adapters/email` | `EmailSender` over Resend's HTTP API (no SDK), 10 s timeout; failures throw `EMAIL_SEND_FAILED` with the provider's reason |

The gateway implements `ModelGateway` from `@synapse/core/contracts`: `chat.generateText` returns
text, model info and token usage; `embedding.embed` / `embedMany` return vectors in input order.
`chatModel` is an escape hatch for AI SDK streaming tool-calling chat (used by `apps/api`'s
`ChatService`) until a streaming contract exists.

## Notes

One of the places allowed to import vendor SDKs (with `providers` and `database`).
