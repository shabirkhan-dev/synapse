export const MAINTENANCE_QUEUES = {
	PRUNE: "maintenance.prune",
} as const;

/** Daily at 03:17 UTC (off the hour, so it does not pile onto :00 jobs). */
export const PRUNE_CRON = "17 3 * * *";

const DAY_SECONDS = 86_400;

/** How long finished rows are kept before pruning. */
export const RETENTION_SECONDS = {
	/** Rate-limit windows are at most an hour; a day is plenty. */
	RATE_LIMITS: DAY_SECONDS,
	/** Used or expired emailed links. */
	AUTH_TOKENS: 7 * DAY_SECONDS,
	/** Revoked or expired sessions (kept a while for support questions). */
	AUTH_SESSIONS: 30 * DAY_SECONDS,
	/** Checkpoints of jobs that never finished (failed for good). */
	JOB_CHECKPOINTS: 30 * DAY_SECONDS,
} as const;
