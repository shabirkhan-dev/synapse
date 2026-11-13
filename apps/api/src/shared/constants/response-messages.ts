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
		BODY_TOO_LARGE: "Request body is too large",
		DEPENDENCY_UNAVAILABLE: "A provider is unavailable right now; try again shortly",
		DEPENDENCY_TIMEOUT: "A provider did not answer in time; try again",
		ROUTE_NOT_FOUND: (method: string, path: string) => `Route ${method} ${path} not found`,
	},
} as const;
