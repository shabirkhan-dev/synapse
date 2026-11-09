/** Same limits as the API's `/rag/query` and `/oversight/feedback` bodies. */
export const PLAYGROUND_LIMITS = {
	QUERY_MAX: 4000,
	TOP_K_MAX: 20,
	TOP_K_DEFAULT: 5,
	COMMENT_MAX: 2000,
} as const;
