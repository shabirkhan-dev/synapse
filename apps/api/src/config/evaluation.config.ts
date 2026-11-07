import { loadConfig } from "@synapse/core/config";
import { z } from "zod";

const booleanFromString = z
	.enum(["true", "false"])
	.default("false")
	.transform((value) => value === "true");

/** Only what `evaluate.ts` needs: a database and retrieval settings. No model keys. */
const evaluationEnvSchema = z.object({
	DATABASE_URL: z.url(),
	DATABASE_SSL: z.enum(["true", "false"]).optional(),
	RAG_SEARCH_MODE: z.enum(["vector", "hybrid"]).default("hybrid"),
	EVAL_K: z.coerce.number().int().min(1).max(20).default(3),
	EVAL_CHUNK_SIZE: z.coerce.number().int().min(200).max(8000).default(1000),
	EVAL_CHUNK_OVERLAP: z.coerce.number().int().min(0).max(2000).default(150),
	/** Max allowed drop per metric before the run fails. */
	EVAL_TOLERANCE: z.coerce.number().min(0).max(1).default(0.02),
	/** Write the current metrics as the new baseline instead of comparing. */
	EVAL_UPDATE_BASELINE: booleanFromString,
});

export type EvaluationConfig = z.infer<typeof evaluationEnvSchema>;

export function loadEvaluationConfig(source: Record<string, string | undefined> = process.env) {
	return loadConfig(evaluationEnvSchema, source);
}
