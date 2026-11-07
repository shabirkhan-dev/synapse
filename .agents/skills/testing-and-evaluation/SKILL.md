---
name: testing-and-evaluation
description: Use when writing tests, building evaluation datasets, or measuring retrieval, generation, agent or safety quality.
---

# testing-and-evaluation

> Status: Live: unit/integration tests and retrieval evals (`@synapse/evaluation`, `bun run eval:retrieval`,
> CI regression vs committed baselines). Generation, agent and safety evals are planned.

## When to use

Any behaviour change (tests) or any change that can move AI quality (evals).

## Workflow

1. Unit-test logic with LLMs/embeddings mocked (`ai/test` mocks).
2. Integration-test DB behaviour against real pgvector (opt-in env URL).
3. For AI quality, add or extend a dataset in `evaluation/datasets` and score with `evaluation/<retrieval|generation|agents|safety>`.
4. Keep a regression suite (`evaluation/regression`) that CI runs on prompt, model or retrieval changes.
5. Report before/after scores in the PR.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`
- No test skipped or weakened

## References

- `.agents/rules/testing.md`
- `docs/guides/evaluation-guide.md`
