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
| `createModelGateway({ chat, embedding })`, `ModelGatewayOptions` | `@synapse/adapters/model-gateway` | `ModelGateway` from two `@synapse/providers` specs: chat and embeddings can each come from a different vendor |
| `createHashingEmbeddingGateway({ dimensions })` | `@synapse/adapters/model-gateway` | Offline deterministic bag-of-words embeddings (`hashing:bow-v1`) for evals and tests |
| `createAiSdkModelGateway({ chatModel, embeddingModel, chatInfo, embeddingInfo })`, `AiSdkModelGateway` | `@synapse/adapters/model-gateway` | Wrap any AI SDK models (tests pass mocks); also exposes `chatModel`. One attempt per call (`maxRetries: 0`): retries come from `@synapse/reliability` |
| `createPostgresCheckpointer({ connectionString, schema? })` → `{ saver, setup, close }` | `@synapse/adapters/checkpointer` | LangGraph checkpoints in Postgres (`langgraph` schema; `setup()` creates/migrates the tables) |
| `createPgBossJobQueue({ connectionString, schema?, ssl?, onError })` | `@synapse/adapters/queue` | `JobQueue` on pg-boss 12 (`exclusive`/`standard` policies, retries with backoff, expiry, UTC cron schedules, graceful stop) |
| `createResendEmailSender({ apiKey, from, timeoutMs? })`, `EMAIL_ERROR_CODES` | `@synapse/adapters/email` | `EmailSender` over Resend's HTTP API (no SDK), 10 s timeout; failures throw `EMAIL_SEND_FAILED` with the provider's reason |

The gateway implements `ModelGateway` from `@synapse/core/contracts`: `chat.generateText` returns
text, model info and token usage; `embedding.embed` / `embedMany` return vectors in input order.
`chatModel` is an escape hatch for AI SDK streaming tool-calling chat (used by `apps/api`'s
`ChatService`) until a streaming contract exists.

## Notes

One of the places allowed to import vendor SDKs (with `providers` and `database`).
