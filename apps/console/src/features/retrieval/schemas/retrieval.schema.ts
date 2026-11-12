import { z } from "zod";

import { PASSAGES_MAX } from "../constants/retrieval.constants";

export const matchSchema = z.object({
	chunkId: z.string(),
	documentId: z.string(),
	documentTitle: z.string(),
	chunkIndex: z.number().int(),
	content: z.string(),
	score: z.number(),
	ranks: z
		.object({
			vector: z.number().int().optional(),
			keyword: z.number().int().optional(),
			rerank: z.number().int().optional(),
		})
		.optional(),
});

/** `data` of `POST /rag/query` with `answer: false`. */
export const retrievalResultSchema = z.object({ matches: z.array(matchSchema) });

export const compareFormSchema = z.object({
	query: z.string().trim().min(1, "Type what to search for").max(4000, "At most 4000 characters"),
	topK: z.coerce
		.number({ message: "Enter a number" })
		.int("Enter a whole number")
		.min(1, "At least 1")
		.max(PASSAGES_MAX, `At most ${PASSAGES_MAX}`),
});
