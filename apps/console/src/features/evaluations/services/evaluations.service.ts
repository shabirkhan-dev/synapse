import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import {
	evalQuestionSchema,
	evalRunSchema,
	evalRunSummarySchema,
} from "../schemas/evaluation.schema";
import type {
	AddQuestionInput,
	EvalQuestion,
	EvalRun,
	EvalRunSummary,
} from "../types/evaluation.types";

export const evaluationsService = {
	questions: (): Promise<EvalQuestion[]> =>
		api(endpoints.evaluations.questions, { schema: z.array(evalQuestionSchema) }),

	addQuestion: (input: AddQuestionInput): Promise<EvalQuestion> =>
		api(endpoints.evaluations.questions, {
			method: "POST",
			body: input,
			schema: evalQuestionSchema,
		}),

	removeQuestion: (id: string): Promise<unknown> =>
		api(endpoints.evaluations.question(id), { method: "DELETE", schema: z.unknown() }),

	/** Every question through each search mode; resolves with the stored run. */
	run: (k: number): Promise<EvalRun> =>
		api(endpoints.evaluations.runs, { method: "POST", body: { k }, schema: evalRunSchema }),

	/** Newest first, without per-question results. */
	runs: (): Promise<EvalRunSummary[]> =>
		api(endpoints.evaluations.runs, { schema: z.array(evalRunSummarySchema) }),

	runDetail: (id: string): Promise<EvalRun> =>
		api(endpoints.evaluations.run(id), { schema: evalRunSchema }),
};
