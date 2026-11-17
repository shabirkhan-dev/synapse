export const HEALTH_ERROR_CODES = {
	DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
} as const;

export const HEALTH_MESSAGES = {
	HEALTHY: "Service is up",
	READY: "Service is ready",
	DATABASE_UNAVAILABLE: "Database is not reachable",
} as const;

/** A readiness probe answers within this, even when Postgres hangs (load balancers give up sooner). */
export const HEALTH_READY_TIMEOUT_MS = 2_000;
