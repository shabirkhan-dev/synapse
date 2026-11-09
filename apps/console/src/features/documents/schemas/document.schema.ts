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
