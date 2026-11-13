import type { z } from "zod";

import type {
	addQuestionFormSchema,
	evalQuestionSchema,
	evalRunSchema,
	evalRunSummarySchema,
} from "../schemas/evaluation.schema";

export type EvalQuestion = z.infer<typeof evalQuestionSchema>;
export type EvalRunSummary = z.infer<typeof evalRunSummarySchema>;
export type EvalRun = z.infer<typeof evalRunSchema>;
export type AddQuestionInput = z.output<typeof addQuestionFormSchema>;
