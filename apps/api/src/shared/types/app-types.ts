import type { OrganizationRole } from "@synapse/security";

/** The authenticated caller, set by the auth middleware from the access token and membership. */
export type AuthUser = {
	/** User id (JWT `sub`). Per-user data (memory, feedback, account) is scoped to it. */
	sub: string;
	/** Session id (JWT `sid`). */
	sid: string;
	/** Active organization (JWT `org`, or the personal one = `sub`). Shared data is scoped to it. */
	orgId: string;
	/** The caller's role in `orgId`, read from the database on every request. */
	role: OrganizationRole;
};

/** Per-request facts services record (e.g. in the audit trail). */
export type RequestContext = {
	/** `x-request-id`; `null` for work outside a request (jobs, approved actions). */
	requestId: string | null;
	/** User who acted, when it differs from the data's owner (an organization member). */
	actorId?: string;
};

/** Hono context variables shared by every route. */
export type AppVariables = {
	requestId: string;
	user: AuthUser;
};

export type AppBindings = {
	Variables: AppVariables;
};
