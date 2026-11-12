import { z } from "zod";

const tokens = { inputTokens: z.number(), outputTokens: z.number() };

/** `data` of `GET /audit/usage`. */
export const usageSchema = z.object({
	scope: z.enum(["organization", "you"]),
	days: z.number(),
	since: z.string(),
	totals: z.object({
		answers: z.number(),
		...tokens,
		costUsd: z.number().nullable(),
		unpricedAnswers: z.number(),
	}),
	daily: z.array(z.object({ day: z.string(), answers: z.number(), ...tokens })),
	models: z.array(
		z.object({
			source: z.enum(["rag", "chat"]),
			chatModel: z.string(),
			promptVersion: z.string(),
			embeddingModel: z.string(),
			answers: z.number(),
			...tokens,
			costUsd: z.number().nullable(),
		}),
	),
});
