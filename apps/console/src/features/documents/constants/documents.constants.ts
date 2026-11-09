/** Same limits as the API's ingest body (`apps/api` rag schemas). */
export const DOCUMENT_LIMITS = {
	TITLE_MAX: 300,
	CONTENT_MAX: 500_000,
	SOURCE_MAX: 2048,
} as const;
