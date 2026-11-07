import type { AuthUser } from "@/modules/auth/auth.types";

/** Hono context variables shared by every route. */
export type AppVariables = {
	requestId: string;
	user: AuthUser;
};

export type AppBindings = {
	Variables: AppVariables;
};
