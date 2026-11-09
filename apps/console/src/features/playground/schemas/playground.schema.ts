import { z } from "zod";

import { PLAYGROUND_LIMITS } from "../constants/playground.constants";

export const questionFormSchema = z.object({
	query: z
		.string()
		.trim()
		.min(1, "Ask a question")
		.max(PLAYGROUND_LIMITS.QUERY_MAX, `At most ${PLAYGROUND_LIMITS.QUERY_MAX} characters`),
	topK: z.coerce
		.number()
		.int("Use a whole number")
		.min(1, "At least 1")
		.max(PLAYGROUND_LIMITS.TOP_K_MAX, `At most ${PLAYGROUND_LIMITS.TOP_K_MAX}`),
});

const matchSchema = z.object({
	chunkId: z.string(),
	documentId: z.string(),
	documentTitle: z.string(),
	source: z.string().nullable(),
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

const citationSchema = z.object({
	index: z.number().int(),
	chunkId: z.string(),
	documentId: z.string(),
	title: z.string(),
	source: z.string().nullable(),
});

const provenanceSchema = z.object({
	chatModel: z.string(),
	promptVersion: z.string(),
	embeddingModel: z.string(),
	chunkerVersion: z.string(),
	reranker: z.string().optional(),
	usage: z.object({
		inputTokens: z.number().int().optional(),
		outputTokens: z.number().int().optional(),
	}),
});

/** `data` of `POST /rag/query`. */
export const ragAnswerSchema = z.object({
	answer: z.string().nullable(),
	matches: z.array(matchSchema),
	citations: z.array(citationSchema),
	provenance: provenanceSchema.nullable(),
});

/** `data` of `POST /oversight/feedback`. */
export const feedbackSchema = z.object({
	requestId: z.string(),
	rating: z.enum(["up", "down"]),
	comment: z.string().nullable(),
});
