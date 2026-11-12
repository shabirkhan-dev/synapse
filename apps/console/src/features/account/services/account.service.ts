import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { revokedSessionsSchema, sessionListSchema } from "../schemas/session.schema";
import type { Session } from "../types/session.types";

export const accountService = {
	/** Browsers and devices signed in to this account, this one marked `current`. */
	sessions: (): Promise<Session[]> => api(endpoints.auth.sessions, { schema: sessionListSchema }),

	/** That device's refresh stops working; it is signed out within 15 minutes at most. */
	revokeSession: (id: string): Promise<unknown> =>
		api(endpoints.auth.session(id), { method: "DELETE", schema: z.null() }),

	revokeOtherSessions: (): Promise<{ revoked: number }> =>
		api(endpoints.auth.revokeOtherSessions, { method: "POST", schema: revokedSessionsSchema }),

	/** Emails a new verification link (rate limited by the API). */
	resendVerification: (): Promise<unknown> =>
		api(endpoints.auth.resendVerification, { method: "POST", schema: z.null() }),
};
