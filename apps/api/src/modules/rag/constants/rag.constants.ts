export const RAG_ERROR_CODES = {
	EMPTY_DOCUMENT: "RAG_EMPTY_DOCUMENT",
	DOCUMENT_NOT_FOUND: "RAG_DOCUMENT_NOT_FOUND",
	EMBEDDING_DIMENSION_MISMATCH: "RAG_EMBEDDING_DIMENSION_MISMATCH",
	UNSUPPORTED_FILE: "RAG_UNSUPPORTED_FILE",
	FILE_HAS_NO_TEXT: "RAG_FILE_HAS_NO_TEXT",
	FILE_UNREADABLE: "RAG_FILE_UNREADABLE",
	FILE_TIMED_OUT: "RAG_FILE_TIMED_OUT",
	FILE_TOO_LONG: "RAG_FILE_TOO_LONG",
	URL_NOT_ALLOWED: "RAG_URL_NOT_ALLOWED",
	URL_UNREACHABLE: "RAG_URL_UNREACHABLE",
	URL_TIMED_OUT: "RAG_URL_TIMED_OUT",
	URL_TOO_LARGE: "RAG_URL_TOO_LARGE",
	URL_UNSUPPORTED: "RAG_URL_UNSUPPORTED",
	URL_HAS_NO_TEXT: "RAG_URL_HAS_NO_TEXT",
} as const;

export const RAG_MESSAGES = {
	DOCUMENT_INGESTED: "Document ingested",
	DOCUMENT_ALREADY_INGESTED: "Document already ingested",
	DOCUMENTS_FETCHED: "Documents retrieved",
	DOCUMENT_FETCHED: "Document retrieved",
	MODE_NEEDS_RETRIEVAL_ONLY: "mode only applies to retrieval: set answer to false",
	DOCUMENT_DELETED: "Document deleted",
	QUERY_ANSWERED: "Query answered",
	FOLLOW_UPS_SUGGESTED: "Follow-up questions suggested",
	MATCHES_FOUND: "Matching passages retrieved",
	EMPTY_DOCUMENT: "Document content is empty",
	DOCUMENT_NOT_FOUND: "Document not found",
	UNSUPPORTED_FILE: "Upload a .txt, .md or .pdf file",
	FILE_HAS_NO_TEXT:
		"This file has no text to search. A scanned PDF needs text recognition (OCR) first",
	FILE_UNREADABLE: "This PDF could not be read. It may be damaged or password-protected",
	FILE_TIMED_OUT: "This PDF took too long to read. Try a smaller file, or export it again as PDF",
	FILE_TOO_LONG: (max: number) =>
		`This file has more than ${max.toLocaleString("en-US")} characters of text; split it up`,
	URL_NOT_ALLOWED:
		"That address can't be read: use a public http(s) page (no private or internal addresses, standard ports only)",
	URL_UNREACHABLE: "That page could not be reached or did not answer with a page",
	URL_TIMED_OUT: "That page took too long to answer",
	URL_TOO_LARGE: "That page is too large to add (over 2 MiB)",
	URL_UNSUPPORTED:
		"Only web pages (HTML) and plain text can be added by address; upload PDFs as files",
	URL_HAS_NO_TEXT: "That page has no readable text (it may need JavaScript to show its content)",
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

/** Most documents one question can be narrowed to (`documentIds`). */
export const RAG_MAX_SCOPE_DOCUMENTS = 20;

/** Chunks per page on a document's detail. */
export const RAG_DEFAULT_CHUNK_PAGE = 50;
export const RAG_MAX_CHUNK_PAGE = 200;
