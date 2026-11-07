# ADR-0003: LLM provider abstraction

- Status: Accepted
- Date: 2026-11-07

## Context

Models and vendors change quickly. Domain code that imports a vendor SDK directly becomes hard to
switch, test and trace.

## Decision

All model calls (chat, embeddings, reranking) go through a **model-gateway** contract defined in
`core` and implemented in `adapters/model-gateway`, which delegates to vendor integrations in
`packages/providers` (OpenAI, Anthropic, Google, Cohere). Domain packages never import a provider
SDK. Every call records the model id and, for generation, the prompt version; embeddings record
the embedding model and version.

## Consequences

- Swapping or adding a model is a configuration/adapter change, not a domain change.
- Fallback chains, retries, cost tracking and tracing live in one place.
- Today's seed is `apps/api/src/modules/ai/ai.provider.ts` (AI SDK, OpenAI-compatible endpoint,
  OpenRouter by default); it moves into the gateway when `adapters` is created.

## Alternatives considered

- Call vendor SDKs directly: simplest, but couples every package to a vendor.
- A hosted gateway only: useful later as one provider behind the same contract.
