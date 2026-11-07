# @synapse/evaluation

Measure retrieval quality and catch regressions. Domain package (depends on `@synapse/core`).
Full description: [docs/packages/evaluation.md](../../docs/packages/evaluation.md).

```bash
DATABASE_URL=postgresql://synapse:synapse@localhost:5433/synapse bun run eval:retrieval
EVAL_UPDATE_BASELINE=true bun run eval:retrieval   # after an intended change, commit the new baseline
```

| Module | Status |
| --- | --- |
| `datasets/` — `RETRIEVAL_SEED` (12 docs, 18 cases: keyword, paraphrase, distractor) | Live |
| `retrieval/` — `recallAtK`, `reciprocalRank`, `evaluateRetrieval` | Live |
| `regression/` — `compareToBaseline`, `formatRetrievalReport`, `baselines/` | Live |
| `generation/ agents/ safety/` | Planned |
