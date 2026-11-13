import { z } from "@hono/zod-openapi";

import { EVAL_DEFAULT_K, EVAL_MAX_K, EVAL_MODES } from "../constants/evaluations.constants";

export const evalIdParamsSchema = z.object({
	id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const addQuestionBodySchema = z
	.object({
		question: z.string().trim().min(1).max(1000).openapi({ example: "How long do refunds take?" }),
		expectedDocumentIds: z.array(z.uuid()).min(1).max(10),
	})
	.openapi("AddEvalQuestionBody");

export const runBodySchema = z
	.object({ k: z.number().int().min(1).max(EVAL_MAX_K).default(EVAL_DEFAULT_K) })
	.openapi("RunEvaluationBody");

export const evalQuestionSchema = z
	.object({
		id: z.uuid(),
		question: z.string(),
		expectedDocumentIds: z.array(z.uuid()),
		createdAt: z.string(),
	})
	.openapi("EvalQuestion");

const metricsSchema = z.object({
	/** Share of expected documents found in the top k, averaged over questions. */
	recallAtK: z.number(),
	/** Mean of 1 / rank of the first expected document (0 when not found). */
	mrr: z.number(),
});

const modeRecord = <T extends z.ZodType>(value: T) =>
	z.object(
		Object.fromEntries(EVAL_MODES.map((mode) => [mode, value])) as Record<
			(typeof EVAL_MODES)[number],
			T
		>,
	);

export const evalRunSummarySchema = z
	.object({
		id: z.uuid(),
		k: z.number().int(),
		questionCount: z.number().int(),
		embeddingModel: z.string(),
		chunkerVersion: z.string(),
		modes: modeRecord(metricsSchema),
		createdAt: z.string(),
	})
	.openapi("EvalRunSummary");

export const evalRunSchema = evalRunSummarySchema
	.extend({
		cases: z.array(
			z.object({
				questionId: z.uuid(),
				question: z.string(),
				expectedDocumentIds: z.array(z.uuid()),
				/** 1-based rank of the first expected document per mode; null when not retrieved. */
				ranks: modeRecord(z.number().int().nullable()),
			}),
		),
	})
	.openapi("EvalRun");
