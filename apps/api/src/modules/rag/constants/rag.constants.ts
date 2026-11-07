export const RAG_ERROR_CODES = {
	EMPTY_DOCUMENT: "RAG_EMPTY_DOCUMENT",
	DOCUMENT_NOT_FOUND: "RAG_DOCUMENT_NOT_FOUND",
	EMBEDDING_DIMENSION_MISMATCH: "RAG_EMBEDDING_DIMENSION_MISMATCH",
} as const;

export const RAG_MESSAGES = {
	DOCUMENT_INGESTED: "Document ingested",
	DOCUMENTS_FETCHED: "Documents retrieved",
	DOCUMENT_DELETED: "Document deleted",
	QUERY_ANSWERED: "Query answered",
	MATCHES_FOUND: "Matching passages retrieved",
	EMPTY_DOCUMENT: "Document content is empty",
	DOCUMENT_NOT_FOUND: "Document not found",
	DOCUMENT_TOO_LARGE: "Document body must be 2 MB or smaller",
	NO_DOCUMENTS_TO_ANSWER_FROM: "I could not find any ingested documents to answer from.",
	EMBEDDING_DIMENSION_MISMATCH: (actual: number, expected: number) =>
		`Embedding model returned ${actual} dimensions; the database expects ${expected}`,
} as const;

/** Ingest body limit. */
export const RAG_MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

export const RAG_DEFAULT_LIST_LIMIT = 50;

export const RAG_ANSWER_SYSTEM_PROMPT = [
	"You answer questions using only the numbered context passages provided.",
	"Cite passages inline as [1], [2], ... matching their numbers.",
	"If the context does not contain the answer, say you do not know.",
].join("\n");
