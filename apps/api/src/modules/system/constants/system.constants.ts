export const SYSTEM_MESSAGES = {
	STATUS_FETCHED: "System status retrieved",
	ADMINS_ONLY: "Only admins and owners can see the system status",
} as const;

/** Latest job checkpoints shown (one per long job). */
export const SYSTEM_CHECKPOINT_LIMIT = 10;

/** Postgres "undefined_table": the pg-boss schema does not exist until the worker first starts. */
export const UNDEFINED_TABLE = "42P01";
