---
name: rag-engineering
description: Use for end-to-end retrieval-augmented generation work that spans ingestion, retrieval and generation.
---

# rag-engineering

> Status: Live seed in `apps/api` (`/rag/*`, `/chat`); package split planned.

## When to use

A change touches more than one RAG stage, or you are tuning answer quality end to end.

## Workflow

1. Locate the stage: ingestion → knowledge (chunk/embed) → retrieval (search/rerank/filter) → generation (prompt/context/citations).
2. Change one stage at a time and measure with `packages/evaluation` datasets before and after.
3. Always apply the access filter before ranking; never let a user retrieve another owner's chunks.
4. Answers cite the chunks they used; record model, prompt version and embedding version.
5. Treat retrieved text as untrusted (prompt-injection defense in `guardrails`).

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`
- Evaluation scores do not regress

## References

- `docs/guides/rag-guide.md`
- `skills/retrieval-engineering/`
- `skills/generation-engineering/`
