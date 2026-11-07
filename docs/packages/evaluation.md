# `@synapse/evaluation`

Measure quality: datasets and scorers for retrieval, generation, agents and safety, plus regression runs.

> **Status:** Planned.

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

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
