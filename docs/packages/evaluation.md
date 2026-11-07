# `@synapse/evaluation`

Measure quality: datasets and scorers for retrieval, generation, agents and safety, plus regression runs.

> **Status:** Live (retrieval datasets, recall@k / MRR, baselines, CI regression) · Planned (generation,
> agent and safety evals; real-model runs).

## Internal modules

`datasets/ retrieval/ generation/ agents/ safety/ regression/`

## Owns

- Evaluation datasets (incl. exported feedback)
- Retrieval metrics (recall@k, MRR)
- Generation and agent scoring
- Safety evals
- Regression suites for CI

## Does not own

- Unit tests (stay with each package)

## Depends on

`core`, and the packages under test

## Public API

| Export | What it does |
| --- | --- |
| `RETRIEVAL_SEED`, `RetrievalDataset` | Versioned dataset: documents with stable ids, cases with `relevant` ids and tags |
| `recallAtK`, `reciprocalRank`, `mean`, `uniqueInOrder` | Metrics over deduplicated document ids |
| `evaluateRetrieval({ dataset, k, setup, search })` → `RetrievalReport` | Per-case results + mean recall@k and MRR |
| `compareToBaseline(report, baseline, tolerance = 0.02)`, `baselineName`, `toBaseline`, `formatRetrievalReport` | Regression gate and CI log table |
| `BASELINES_DIR`, `createUnavailableChat` | Committed baselines; chat stand-in for retrieval-only runs |

**Runner:** `bun run eval:retrieval` (`apps/api/src/evaluate.ts`) ingests the dataset under a
throwaway owner through the real `RagService` (Postgres + pgvector + full-text + RRF) with offline
hashing embeddings (`@synapse/adapters`), scores it, compares to
`baselines/<dataset>@<version>.<embedding>.<mode>.k<k>.json`, deletes its documents, and exits 1 on
a regression. CI runs it in the `api` job.

Current baseline (`retrieval-seed@1`, `hashing:bow-v1`, hybrid, k=3): recall@3 0.889, MRR 0.824.
Hashing embeddings measure the pipeline (chunking, keyword, fusion, filters), not embedding-model
quality.
