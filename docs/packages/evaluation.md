# `@synapse/evaluation`

Measure quality: datasets and scorers for retrieval, generation, agents and safety, plus regression runs.

> **Status:** Live (retrieval datasets, recall@k / MRR, baselines, CI regression; workspace runs on
> the real index through the API's `evaluations` module and the console's Evaluations page; answer
> faithfulness and relevance by an LLM judge, opt-in per run) · Planned (agent and safety evals; a
> live check of the judge against its labelled cases, which needs a chat model key).

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
| `judgeAnswer({ chat, question, answer, passages })` → `{ faithfulness, relevance, reason, judge, usage }` | One chat call with a rubric (`ANSWER_JUDGE_VERSION` = `answer-judge@1`): faithfulness = share of the answer's claims the passages support, relevance = how fully it answers the question, both 0–1. Passages and answer are framed as data. Replies without two scores in 0–1 throw `EVALUATION_JUDGE_UNREADABLE` (`readScores` tolerates a code fence) |
| `checkJudge(chat, cases = JUDGE_CHECK_CASES)` → `{ agreed, total, disagreements }` | Six hand-labelled answers (supported, invented, off-topic, contradicting, injection) with high/low verdicts; run it against a real judge model before trusting its scores |

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

**Answer quality (syn-073):** a workspace run with `judgeAnswers: true` also answers every question
through the normal RAG path (hybrid, top k, audited as `rag.query.answered` like any answer) and
asks the chat model to judge it, four questions at a time. The run stores each answer with its
scores and reason, and the mean faithfulness and relevance over the judged answers with the judge's
model and version. A failed answer or an unreadable verdict leaves that question unjudged (with the
reason), it does not fail the run. Unlike Ragas, faithfulness comes from one rubric call, not
claim-by-claim checks: cheaper and coarser, and the same model writes and grades the answer unless
the deployment points the chat model elsewhere. Compare scores only between runs with the same
judge and version.
