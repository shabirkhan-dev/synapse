# `@synapse/core`

Shared types, contracts (interfaces), errors, events, config and utilities that every other package builds on.

> **Status:** Live (errors, config, types, contracts: model gateway, reranker, email sender, job queue) · Placeholder (events, utils).

## Internal modules

`types/ contracts/ errors/ events/ config/ utils/`

## Owns

- Domain types (Document, Chunk, Query, Answer, Citation, Job…)
- Contracts: repository, model-gateway, vector-store, queue, cache and storage interfaces
- Typed error base class and codes
- Event types shared by audit and observability
- Config loading and Zod env helpers

## Does not own

- Any implementation that talks to a vendor or database (→ `adapters`, `providers`)

## Depends on

nothing in the workspace (only Zod and the standard library)

## Public API

| Export | Module | What it does |
| --- | --- | --- |
| `SynapseError`, `isSynapseError`, `SynapseErrorOptions` | `@synapse/core/errors` | Transport-neutral error with `code`, `message`, optional `details` and `cause` |
| `loadConfig(schema, source?)`, `ConfigSource` | `@synapse/core/config` | Zod-validated config from `process.env` (empty strings = unset); throws `CONFIG_INVALID` |
| `AnswerProvenance` | `@synapse/core/types` | `chatModel`, `promptVersion`, `embeddingModel`, `chunkerVersion`, `usage` behind an answer |
| `ModelGateway`, `ChatGateway`, `EmbeddingGateway`, `ModelInfo`, `TextGenerationRequest/Result`, `TokenUsage`, `CallOptions` | `@synapse/core/contracts` | How domain code calls models; implemented in `@synapse/adapters` |
| `Reranker`, `RerankRequest`, `RerankedDocument` | `@synapse/core/contracts` | Second-stage ranking (`{ index, score }` best first); implemented in `@synapse/adapters/model-gateway` |
| `JobQueue`, `QueueJob`, `QueueOptions`, `JobHandler` | `@synapse/core/contracts` | Background jobs; implemented in `@synapse/adapters/queue` (pg-boss) |
| `EmailSender`, `EmailMessage` | `@synapse/core/contracts` | How code sends email; implemented in `@synapse/adapters/email` (Resend) |

The root entry (`@synapse/core`) re-exports errors, config, types and contracts. Events and utils
are placeholders that grow with their first real use.

## Notes

`apps/api` still uses its own `AppError` and `parseEnv`; moving it onto `SynapseError` and `loadConfig` is the next step.
