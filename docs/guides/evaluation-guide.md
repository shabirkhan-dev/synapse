# Evaluation guide

> **Status:** Live for retrieval · Planned for generation, agent and safety evals.

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://synapse:synapse@localhost:5433/synapse
bun run db:migrate
bun run eval:retrieval                      # compare to the committed baseline (CI does this)
RAG_SEARCH_MODE=vector bun run eval:retrieval
EVAL_K=1 bun run eval:retrieval
EVAL_UPDATE_BASELINE=true bun run eval:retrieval   # intended change: write + commit a new baseline
```

The report lists every case (`ok` / `MISS`, reciprocal rank, retrieved documents) and the deltas
against the baseline; the run fails when recall@k or MRR drops more than `EVAL_TOLERANCE` (0.02).

Adding cases: edit `packages/evaluation/src/datasets/retrieval-seed.ts`, **bump `version`**, run with
`EVAL_UPDATE_BASELINE=true`, commit the new baseline. Include distractors (documents sharing words
with the right one) — an eval that always scores 100% cannot catch regressions.

Findings so far (`retrieval-seed@1`, hashing embeddings, k=3): hybrid recall 0.944 / MRR 0.944 vs
vector-only recall 0.889 / MRR 0.824, after keyword search moved to any-term matching (syn-021; it
was AND-only, which made hybrid no better than vector).
