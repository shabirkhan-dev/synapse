# `@synapse/providers`

Thin model-vendor integrations: OpenAI, Anthropic, Google, Cohere and any OpenAI-compatible endpoint.

> **Status:** Live (chat models from all five, embedding models from all but Anthropic, Cohere
> reranking, chosen per use by config) · Planned (per-organization keys). Langfuse needs no SDK:
> traces go over OTLP from `observability`.

## Internal modules

`models/` (`model-spec.ts`, `create-models.ts`, `resolve-spec.ts`)

## Owns

- Vendor SDK clients (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/cohere`,
  `@ai-sdk/openai-compatible`) and their settings
- The provider/model pair each model records for provenance
- Asking each vendor for the embedding size the schema needs

## Does not own

- The `ModelGateway` built from these models (→ `adapters/model-gateway`)
- Timeouts, retries, fallback (→ `reliability`) · choosing prompts (→ `generation`)

## Depends on

`core`, the AI SDK and the vendor packages above (pinned to one `@ai-sdk/provider` version).

## Public API

| Export | What it does |
| --- | --- |
| `createChatModel(spec)` | `{ model, info }`: an AI SDK chat model and `{ provider, model }` for provenance. OpenAI uses the Responses API |
| `createEmbeddingModel(spec)` | `{ model, info }`; `dimensions` is sent as OpenAI `dimensions`, Google `outputDimensionality` or Cohere `outputDimension` (OpenAI-compatible endpoints use the model's default) |
| `ChatModelSpec`, `EmbeddingModelSpec` | `{ provider, model, apiKey?, baseUrl?, fetch? }`; `openai-compatible` adds `name` and a required `baseUrl` |
| `createRerankingModel(spec)`, `RerankingModelSpec`, `RERANK_PROVIDERS`, `resolveRerankingModelSpec` | Cohere rerank (`/v2/rerank`); `AI_RERANK_PROVIDER=cohere`, `AI_RERANK_MODEL` (default `rerank-v3.5`) |
| `CHAT_PROVIDERS`, `EMBEDDING_PROVIDERS` | `openai-compatible`, `openai`, `anthropic`, `google`, `cohere` (embeddings: no `anthropic`) |
| `ProviderCredentials`, `resolveChatModelSpec`, `resolveEmbeddingModelSpec`, `apiKeyFor` | Turn an app's settings into specs; a separate OpenAI-compatible embeddings endpoint is recorded as `<name>-embeddings` |
| `PROVIDER_KEY_VARIABLES` | The env variable each app reads a vendor key from (named in config errors) |

Keys and base URLs are always passed in; the vendor SDKs never read them from the environment.

## Configuration (api and worker)

| Variable | Default | Meaning |
| --- | --- | --- |
| `AI_CHAT_PROVIDER` | `openai-compatible` | Chat vendor |
| `AI_EMBEDDING_PROVIDER` | `openai-compatible` | Embedding vendor |
| `AI_CHAT_MODEL`, `AI_EMBEDDING_MODEL` | `openai/gpt-4o-mini`, `openai/text-embedding-3-small` | Model ids in that vendor's naming |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `COHERE_API_KEY` | — | Required in production for the selected vendors |
| `AI_BASE_URL`, `AI_PROVIDER_NAME`, `AI_API_KEY`, `AI_EMBEDDING_BASE_URL`, `AI_EMBEDDING_API_KEY` | OpenRouter | The OpenAI-compatible endpoint |
| `AI_FALLBACK_CHAT_PROVIDER`, `AI_FALLBACK_CHAT_MODEL` | chat vendor, none | Chat fallback (api; see `reliability`) |

Example: Claude for chat, OpenAI for embeddings, OpenRouter as the fallback:

```bash
AI_CHAT_PROVIDER=anthropic   AI_CHAT_MODEL=claude-sonnet-5-5   ANTHROPIC_API_KEY=…
AI_EMBEDDING_PROVIDER=openai AI_EMBEDDING_MODEL=text-embedding-3-small OPENAI_API_KEY=…
AI_FALLBACK_CHAT_PROVIDER=openai-compatible AI_FALLBACK_CHAT_MODEL=openai/gpt-4o-mini AI_API_KEY=…
```

## Notes

- Embeddings are versioned as `provider:model`: switching the embedding vendor hides old vectors
  from vector search until the worker re-embeds them (keyword search still finds them).
- The embedding model must return 1536 dimensions (OpenAI `text-embedding-3-*`, Google
  `gemini-embedding-001`, Cohere `embed-v4.0` can; check others).
