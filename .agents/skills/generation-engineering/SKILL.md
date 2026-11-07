---
name: generation-engineering
description: Use when changing LLM providers, prompts, context assembly, completion, citations or structured output.
---

# generation-engineering

> Status: Partly live: models are called through `@synapse/adapters/model-gateway` (`ModelGateway`
> from `@synapse/core/contracts`). Prompt versioning and citations are planned.

## When to use

Adding a model or provider, editing a prompt, changing how context is built, or adding structured output.

## Workflow

1. Call models only through the `ModelGateway` contract (implemented in
   `@synapse/adapters/model-gateway`). Domain code never imports `ai` or `@ai-sdk/*` — enforced by
   `bun run architecture:check`.
2. Prompts are versioned files in `generation/prompts`; the version is recorded with every answer.
3. Context assembly respects a token budget and keeps citation ids attached to each passage.
4. Structured output is validated with Zod; invalid output is retried or fails loudly.
5. Every call has a timeout and goes through `reliability` retry/fallback.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`
- Answers record model + prompt version
- Generation evals do not regress

## References

- `docs/packages/generation.md`
- ADR-0003
