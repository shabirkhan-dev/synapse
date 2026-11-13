# `@synapse/evaluation`

Measure quality: datasets and scorers for retrieval, generation, agents and safety, plus regression runs.

> **Status:** Live (retrieval datasets, recall@k / MRR, baselines, CI regression; workspace runs on
> the real index through the API's `evaluations` module and the console's Evaluations page) ·
> Planned (generation, agent and safety evals).

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

Current baselines (`retrieval-seed@1`, `hashing:bow-v1`, hybrid, k=3): recall@3 0.944, MRR 0.944;
with the offline term-overlap reranker the same (one case reorders below the top hit).

**Reranking:** `EVAL_RERANKER=term-overlap` (offline; CI runs it as a second step) or `cohere`
(needs `COHERE_API_KEY`, `AI_RERANK_MODEL`) searches the same ingested cases with and without the
reranker, prints both, and compares the reranked run to
`baselines/<dataset>@<version>.<embedding>.<mode>.<reranker>.k<k>.json`. Any reranker failure fails
the run (the retriever's silent fallback would otherwise be scored as reranked).
Hashing embeddings measure the pipeline (chunking, keyword, fusion, filters), not embedding-model
quality.
