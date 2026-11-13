export const EVAL_ERROR_CODES = {
	QUESTION_NOT_FOUND: "EVAL_QUESTION_NOT_FOUND",
	RUN_NOT_FOUND: "EVAL_RUN_NOT_FOUND",
	UNKNOWN_DOCUMENTS: "EVAL_UNKNOWN_DOCUMENTS",
	TOO_MANY_QUESTIONS: "EVAL_TOO_MANY_QUESTIONS",
	NO_QUESTIONS: "EVAL_NO_QUESTIONS",
} as const;

export const EVAL_MESSAGES = {
	QUESTIONS_FETCHED: "Evaluation questions retrieved",
	QUESTION_ADDED: "Evaluation question added",
	QUESTION_DELETED: "Evaluation question deleted",
	QUESTION_NOT_FOUND: "Evaluation question not found",
	RUNS_FETCHED: "Evaluation runs retrieved",
	RUN_FETCHED: "Evaluation run retrieved",
	RUN_COMPLETED: "Evaluation run completed",
	RUN_NOT_FOUND: "Evaluation run not found",
	UNKNOWN_DOCUMENTS: "Some expected documents do not exist in this workspace",
	TOO_MANY_QUESTIONS: (max: number) => `A workspace can have at most ${max} evaluation questions`,
	NO_QUESTIONS: "Add a question before running an evaluation",
} as const;

/** Every run asks each question once per mode, so the set is kept small enough to run inline. */
export const EVAL_MAX_QUESTIONS = 50;
export const EVAL_DEFAULT_K = 5;
export const EVAL_MAX_K = 20;
export const EVAL_MODES = ["hybrid", "vector", "keyword"] as const;
/** Chunks fetched per question: several chunks of one document collapse into one result. */
export const EVAL_CHUNKS_PER_RESULT = 4;
export const EVAL_MAX_CHUNKS = 50;
export const EVAL_RUN_LIST_LIMIT = 20;
