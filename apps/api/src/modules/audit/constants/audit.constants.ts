export const AUDIT_MESSAGES = {
	EVENTS_FETCHED: "Audit events retrieved",
	USAGE_FETCHED: "Usage retrieved",
} as const;

export const AUDIT_DEFAULT_LIMIT = 50;
export const AUDIT_MAX_LIMIT = 200;

/** Usage window in days: the default and the longest the console asks for. */
export const USAGE_DEFAULT_DAYS = 30;
export const USAGE_MAX_DAYS = 90;
