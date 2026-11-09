import { z } from "@hono/zod-openapi";

import { RAG_DEFAULT_LIST_LIMIT } from "../constants/rag.constants";

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
		/** SHA-256 of the normalized content; re-ingesting the same content returns this document. */
		contentHash: z.string().nullable(),
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
		/**
		 * Higher is better: cosine similarity in `vector` mode, RRF score in `hybrid` mode, the
		 * reranker's relevance when `ranks.rerank` is set. Never compare scores across these.
		 */
		score: z.number(),
		/** 1-based rank in each list that found the chunk, and after reranking when it ran. */
		ranks: z
			.object({
				vector: z.number().int().optional(),
				keyword: z.number().int().optional(),
				rerank: z.number().int().optional(),
			})
			.optional(),
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

export const citationSchema = z
	.object({
		/** The `[n]` used in the answer. */
		index: z.number().int(),
		chunkId: z.uuid(),
		documentId: z.uuid(),
		title: z.string(),
		source: z.string().nullable(),
	})
	.openapi("Citation");

export const answerProvenanceSchema = z
	.object({
		chatModel: z.string().openapi({ example: "openrouter:openai/gpt-4o-mini" }),
		promptVersion: z.string().openapi({ example: "rag-answer@2" }),
		embeddingModel: z.string().openapi({ example: "openrouter:openai/text-embedding-3-small" }),
		chunkerVersion: z.string().openapi({ example: "text-v1;size=1000;overlap=150" }),
		reranker: z.string().optional().openapi({ example: "cohere:rerank-v3.5" }),
		usage: z.object({
			inputTokens: z.number().int().optional(),
			outputTokens: z.number().int().optional(),
		}),
	})
	.openapi("AnswerProvenance");

export const ragQueryResultSchema = z
	.object({
		answer: z.string().nullable(),
		matches: z.array(ragMatchSchema),
		/** Passages the answer cites (empty for retrieval-only queries). */
		citations: z.array(citationSchema),
		/** What produced the answer; null when no model was called. */
		provenance: answerProvenanceSchema.nullable(),
	})
	.openapi("RagQueryResult");

export const documentIdParamsSchema = z.object({
	id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const listDocumentsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(RAG_DEFAULT_LIST_LIMIT),
});
