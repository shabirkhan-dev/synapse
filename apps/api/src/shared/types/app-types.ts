/** The authenticated caller, set by the auth middleware from the access token claims. */
export type AuthUser = {
	/** User id (JWT `sub`). Every tenant-scoped query uses it. */
	sub: string;
	/** Session id (JWT `sid`). */
	sid: string;
};

/** Per-request facts services record (e.g. in the audit trail). */
export type RequestContext = {
	/** `x-request-id`; `null` for work outside a request (jobs, approved actions). */
	requestId: string | null;
};

/** Hono context variables shared by every route. */
export type AppVariables = {
	requestId: string;
	user: AuthUser;
};

export type AppBindings = {
	Variables: AppVariables;
};
