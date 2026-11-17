export const KNOWLEDGE_QUEUES = {
	/** Re-embed chunks whose vectors came from another embedding model. */
	REEMBED_CHUNKS: "knowledge.reembed-chunks",
	/** Re-chunk documents written by a chunker before text-v2 (headings become context). */
	RECHUNK_DOCUMENTS: "knowledge.rechunk-documents",
} as const;
