# Evaluation guide

> **Status:** Planned (`packages/evaluation`).

1. Build a dataset: questions, expected sources, reference answers (feedback from
   `human-oversight` feeds it).
2. Score retrieval (recall@k, MRR), generation (faithfulness, answer quality), agents (task success)
   and safety (injection, leakage).
3. Save a baseline; run the regression suite on every prompt, model or retrieval change.
4. Report scores to Langfuse with the prompt and model versions.

> Placeholder — metrics, thresholds and the first dataset are still to be chosen.
