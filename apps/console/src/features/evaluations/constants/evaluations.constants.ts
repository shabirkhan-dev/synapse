/** The three search modes, named as the Retrieval page names them. */
export const EVAL_MODES = [
	{ mode: "hybrid", label: "Hybrid" },
	{ mode: "vector", label: "Meaning" },
	{ mode: "keyword", label: "Keywords" },
] as const;

export type EvalMode = (typeof EVAL_MODES)[number]["mode"];

/** Same limits as the API (`apps/api` evaluations constants and schemas). */
export const EVAL_LIMITS = {
	QUESTION_MAX: 1000,
	EXPECTED_MAX: 10,
	QUESTIONS_MAX: 50,
} as const;

/** "Top k" choices: how many documents a question may look through to find its answer. */
export const K_OPTIONS = [1, 3, 5, 10] as const;
export const DEFAULT_K = 5;
