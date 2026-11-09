---
id: syn-034
title: Add providers: direct OpenAI, Anthropic, Google and Cohere model adapters
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-033]
branch: main
worktree: none
scope: [packages/providers, packages/adapters, apps/api/src/config]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

Every model call goes through one OpenAI-compatible endpoint (OpenRouter by default).

## Why / Context

Architecture: vendor SDKs live in `providers`; teams want direct provider keys (cost, data terms,
features such as Anthropic prompt caching) and a fallback provider for reliability.

## Proposal or Ask

`@synapse/providers` with AI SDK provider packages (OpenAI, Anthropic, Google, Cohere embeddings),
selected by config (`AI_CHAT_PROVIDER`, `AI_EMBEDDING_PROVIDER`), behind the existing
`ModelGateway`; fallback chat provider wired to the reliability breaker (syn-033).

## Scope

**In scope:**

- providers package, config, gateway selection, docs

**Out of scope:**

- per-organization provider keys (later)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run architecture:check` pass
- gateway built for each provider with mock fetch; provenance names the real provider and model

## Resolution

Done in commit `feat(providers): add direct openai, anthropic, google and cohere models`.

- `@synapse/providers`: `createChatModel` / `createEmbeddingModel` for `openai-compatible`, `openai` (Responses API), `anthropic` (chat only), `google`, `cohere`; each records `{ provider, model }` for provenance; embedding size sent as each vendor's own option (1536); keys and URLs always passed (vendor SDKs never read env). `resolveChatModelSpec` / `resolveEmbeddingModelSpec` / `apiKeyFor` / `PROVIDER_KEY_VARIABLES` shared by api and worker config. Vendor packages pinned to versions on the installed `@ai-sdk/provider@4.0.36` (one copy in the lockfile).
- `@synapse/adapters`: `createModelGateway({ chat, embedding })` replaces `createOpenAICompatibleModelGateway`; adapters no longer depends on a vendor package directly.
- Config: `AI_CHAT_PROVIDER`, `AI_EMBEDDING_PROVIDER`, `AI_FALLBACK_CHAT_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `COHERE_API_KEY` (in `.env.example`; Doppler `synapse/dev` has the providers set and empty key slots). Production requires the key of every selected vendor (chat, embeddings, fallback). Defaults unchanged (OpenRouter), and embedding versions keep their old `provider:model` names, so nothing re-embeds.
- **Validation:** 12 provider tests with a fake fetch answering in each vendor's response shape (endpoint URL, auth header, parsed text and usage for 5 chat vendors; requested dimensions and vector order for 3 embedding vendors; base URL override; spec resolution); adapters test: Anthropic answers through the gateway and the result names it; api: 3 config tests (defaults, mixed vendors incl. fallback, fallback defaults to chat vendor) and 2 env tests (each selected vendor needs its key in production; Anthropic rejected for embeddings); Docker install/build stages simulated for api and worker; real-server smoke with the built bundle against a fake OpenAI-compatible endpoint: ingest 201, cited answer, provenance `openrouter:openai/gpt-4o-mini` / `openrouter:openai/text-embedding-3-small` (unchanged names), 0 errors logged.
- **Not done:** live calls against the vendors (no keys in the sandbox), per-organization keys, Cohere rerank (syn-035).
