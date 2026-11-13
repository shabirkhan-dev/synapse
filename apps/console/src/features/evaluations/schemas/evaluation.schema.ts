import { z } from "zod";

import { EVAL_LIMITS } from "../constants/evaluations.constants";

export const evalQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
	expectedDocumentIds: z.array(z.string()),
	createdAt: z.string(),
});

const metricsSchema = z.object({ recallAtK: z.number(), mrr: z.number() });
const byMode = <T extends z.ZodType>(value: T) =>
	z.object({ hybrid: value, vector: value, keyword: value });

export const evalRunSummarySchema = z.object({
	id: z.string(),
	k: z.number().int(),
	questionCount: z.number().int(),
	embeddingModel: z.string(),
	chunkerVersion: z.string(),
	modes: byMode(metricsSchema),
	createdAt: z.string(),
});

export const evalRunSchema = evalRunSummarySchema.extend({
	cases: z.array(
		z.object({
			questionId: z.string(),
			question: z.string(),
			expectedDocumentIds: z.array(z.string()),
			ranks: byMode(z.number().int().nullable()),
		}),
	),
});

export const addQuestionFormSchema = z.object({
	question: z
		.string()
		.trim()
		.min(1, "Write the question someone would ask")
		.max(EVAL_LIMITS.QUESTION_MAX, `At most ${EVAL_LIMITS.QUESTION_MAX} characters`),
	expectedDocumentIds: z
		.array(z.string())
		.min(1, "Pick at least one document that answers it")
		.max(EVAL_LIMITS.EXPECTED_MAX, `Pick at most ${EVAL_LIMITS.EXPECTED_MAX} documents`),
});
