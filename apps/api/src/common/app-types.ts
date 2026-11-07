import type { AuthUser } from "@/modules/auth";

/** Hono context variables shared by every route. */
export type AppVariables = {
	requestId: string;
	user: AuthUser;
};

export type AppBindings = {
	Variables: AppVariables;
};
