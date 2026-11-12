import { z } from "zod";

import { DOCUMENT_LIMITS } from "../constants/documents.constants";

/** A document as `GET /rag/documents` returns it (only the fields the console shows). */
export const documentSchema = z.object({
	id: z.string(),
	title: z.string(),
	source: z.string().nullable(),
	chunkCount: z.number().int(),
	createdAt: z.string(),
});

export const documentListSchema = z.array(documentSchema);

export const chunkSchema = z.object({
	id: z.string(),
	chunkIndex: z.number().int(),
	content: z.string(),
	chunkerVersion: z.string().nullable(),
	embeddingModel: z.string().nullable(),
});

/** `GET /rag/documents/{id}`: the document, one page of chunks and today's versions. */
export const documentDetailSchema = documentSchema.extend({
	chunks: z.array(chunkSchema),
	page: z.object({ offset: z.number().int(), limit: z.number().int(), total: z.number().int() }),
	current: z.object({ chunkerVersion: z.string(), embeddingModel: z.string() }),
});

export const ingestDocumentFormSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Give the document a title")
		.max(DOCUMENT_LIMITS.TITLE_MAX, `At most ${DOCUMENT_LIMITS.TITLE_MAX} characters`),
	content: z
		.string()
		.trim()
		.min(1, "Paste the document's text")
		.max(DOCUMENT_LIMITS.CONTENT_MAX, "The text is too long (500,000 characters at most)"),
	source: z
		.string()
		.trim()
		.max(DOCUMENT_LIMITS.SOURCE_MAX, `At most ${DOCUMENT_LIMITS.SOURCE_MAX} characters`)
		.optional()
		.transform((value) => value || undefined),
});
