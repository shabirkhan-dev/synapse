import { z } from "@hono/zod-openapi";

export const ingestDocumentBodySchema = z
	.object({
		title: z.string().trim().min(1).max(300).openapi({ example: "Refund policy" }),
		content: z
			.string()
			.min(1)
			.max(500_000)
			.openapi({ example: "Customers can request a refund within 30 days of purchase..." }),
		source: z
			.string()
			.trim()
			.max(2048)
			.optional()
			.openapi({ example: "https://example.com/refunds" }),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.openapi("IngestDocumentBody");

export const ragDocumentSchema = z
	.object({
		id: z.uuid(),
		title: z.string(),
		source: z.string().nullable(),
		metadata: z.record(z.string(), z.unknown()),
		chunkCount: z.number().int(),
		createdAt: z.string(),
	})
	.openapi("RagDocument");

export const ragMatchSchema = z
	.object({
		chunkId: z.uuid(),
		documentId: z.uuid(),
		documentTitle: z.string(),
		source: z.string().nullable(),
		chunkIndex: z.number().int(),
		content: z.string(),
		score: z.number(),
	})
	.openapi("RagMatch");

export const ragQueryBodySchema = z
	.object({
		query: z
			.string()
			.trim()
			.min(1)
			.max(4000)
			.openapi({ example: "How long do I have to ask for a refund?" }),
		topK: z.number().int().min(1).max(50).optional(),
		/** false = retrieval only (no LLM call). */
		answer: z.boolean().default(true),
	})
	.openapi("RagQueryBody");

export const ragQueryResultSchema = z
	.object({
		answer: z.string().nullable(),
		matches: z.array(ragMatchSchema),
	})
	.openapi("RagQueryResult");

export const documentIdParamsSchema = z.object({
	id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const listDocumentsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(50),
});
