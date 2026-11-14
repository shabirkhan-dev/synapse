/** Machine-readable error codes shared by every module. Module-specific codes live in the module. */
export const ERROR_CODES = {
	VALIDATION_ERROR: "VALIDATION_ERROR",
	BAD_REQUEST: "BAD_REQUEST",
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	NOT_FOUND: "NOT_FOUND",
	PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
	RATE_LIMITED: "RATE_LIMITED",
	HTTP_ERROR: "HTTP_ERROR",
	INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
