# `@synapse/providers`

Thin vendor integrations: OpenAI, Anthropic, Google, Cohere and Langfuse.

> **Status:** Planned. Today one OpenAI-compatible provider (OpenRouter default) via `@ai-sdk/openai-compatible`.

## Internal modules

`openai/ anthropic/ google/ cohere/ langfuse/`

## Owns

- Vendor SDK clients and their configuration
- Mapping vendor responses to `core` types

## Does not own

- Choosing which model to use (→ `generation`, `adapters/model-gateway`)

## Depends on

`core`, vendor SDKs

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.

## Notes

The other place allowed to import vendor SDKs.
