import type { Env } from "./env";

export type UsageRule = { limit: number; windowSeconds: number };

/** Per-user budgets for requests that call a model (`shared/middleware/usage-limit.ts`). */
export type LimitsConfig = {
	/** Chat messages and `/rag/query` (answers and searches). */
	questions: UsageRule;
	/** Pasted and uploaded documents (embedding calls). */
	ingests: UsageRule;
	/** Evaluation runs (every question in three modes). */
	evaluationRuns: UsageRule;
};

const MINUTE = 60;
const HOUR = 3600;

export function createLimitsConfig(env: Env): LimitsConfig {
	return {
		questions: { limit: env.RATE_LIMIT_QUESTIONS_PER_MINUTE, windowSeconds: MINUTE },
		ingests: { limit: env.RATE_LIMIT_INGESTS_PER_HOUR, windowSeconds: HOUR },
		evaluationRuns: { limit: env.RATE_LIMIT_EVALUATION_RUNS_PER_HOUR, windowSeconds: HOUR },
	};
}
