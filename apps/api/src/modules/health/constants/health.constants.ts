export const HEALTH_ERROR_CODES = {
	DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
} as const;

export const HEALTH_MESSAGES = {
	HEALTHY: "Service is up",
	READY: "Service is ready",
	DATABASE_UNAVAILABLE: "Database is not reachable",
} as const;
