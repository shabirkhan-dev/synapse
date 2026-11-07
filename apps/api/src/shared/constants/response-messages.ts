/** Consumer-facing messages shared by every module. Module-specific messages live in the module. */
export const RESPONSE_MESSAGES = {
	SUCCESS: {
		OK: "Request completed",
		CREATED: "Resource created",
		FETCHED: "Resource retrieved",
		DELETED: "Resource deleted",
	},
	ERRORS: {
		VALIDATION_FAILED: "Request validation failed",
		REQUEST_FAILED: "Request failed",
		INTERNAL: "Internal server error",
		ROUTE_NOT_FOUND: (method: string, path: string) => `Route ${method} ${path} not found`,
	},
} as const;
