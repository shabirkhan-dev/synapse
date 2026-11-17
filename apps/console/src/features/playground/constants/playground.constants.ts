/** Same limits as the API's `/rag/query` and `/oversight/feedback` bodies. */
export const PLAYGROUND_LIMITS = {
	QUERY_MAX: 4000,
	TOP_K_MAX: 20,
	TOP_K_DEFAULT: 5,
	COMMENT_MAX: 2000,
	/** Most documents one question can be narrowed to. */
	SCOPE_MAX: 20,
} as const;

/** `/playground?d=<document id>` opens the Playground narrowed to that document. */
export const PLAYGROUND_SCOPE_PARAM = "d";
