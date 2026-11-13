export const RAG_ERROR_CODES = {
	EMPTY_DOCUMENT: "RAG_EMPTY_DOCUMENT",
	DOCUMENT_NOT_FOUND: "RAG_DOCUMENT_NOT_FOUND",
	EMBEDDING_DIMENSION_MISMATCH: "RAG_EMBEDDING_DIMENSION_MISMATCH",
	UNSUPPORTED_FILE: "RAG_UNSUPPORTED_FILE",
	FILE_HAS_NO_TEXT: "RAG_FILE_HAS_NO_TEXT",
	FILE_UNREADABLE: "RAG_FILE_UNREADABLE",
	FILE_TOO_LONG: "RAG_FILE_TOO_LONG",
} as const;

export const RAG_MESSAGES = {
	DOCUMENT_INGESTED: "Document ingested",
	DOCUMENT_ALREADY_INGESTED: "Document already ingested",
	DOCUMENTS_FETCHED: "Documents retrieved",
	DOCUMENT_FETCHED: "Document retrieved",
	MODE_NEEDS_RETRIEVAL_ONLY: "mode only applies to retrieval: set answer to false",
	DOCUMENT_DELETED: "Document deleted",
	QUERY_ANSWERED: "Query answered",
	MATCHES_FOUND: "Matching passages retrieved",
	EMPTY_DOCUMENT: "Document content is empty",
	DOCUMENT_NOT_FOUND: "Document not found",
	UNSUPPORTED_FILE: "Upload a .txt, .md or .pdf file",
	FILE_HAS_NO_TEXT:
		"This file has no text to search. A scanned PDF needs text recognition (OCR) first",
	FILE_UNREADABLE: "This PDF could not be read. It may be damaged or password-protected",
	FILE_TOO_LONG: (max: number) =>
		`This file has more than ${max.toLocaleString("en-US")} characters of text; split it up`,
	NO_DOCUMENTS_TO_ANSWER_FROM: "I could not find any ingested documents to answer from.",
	PURGE_REQUESTED: "Deleting all documents needs approval; approve it in /oversight/approvals",
	PURGE_SUMMARY: (count: number, max: number) =>
		count === 1
			? "Delete your only document and its chunks"
			: `Delete all ${count > max ? `${max}+` : count} of your documents and their chunks`,
} as const;

/** Most text one document may hold (pasted or extracted from a file). */
export const RAG_MAX_DOCUMENT_CHARS = 500_000;

/** Longest stored title. */
export const RAG_MAX_TITLE_CHARS = 300;

export const RAG_DEFAULT_LIST_LIMIT = 50;

/** Chunks per page on a document's detail. */
export const RAG_DEFAULT_CHUNK_PAGE = 50;
export const RAG_MAX_CHUNK_PAGE = 200;
