import { z } from "zod";

import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

import { ssoConnectionSchema } from "../schemas/organization.schema";
import type { SsoConnection, SsoSettingsInput } from "../types/organization.types";

/** The active team's single sign-on (`/sso/connection`): admins read, owners change it. */
export const ssoService = {
	connection: (): Promise<SsoConnection | null> =>
		api(endpoints.sso.connection, { schema: ssoConnectionSchema.nullable() }),

	/** An empty secret keeps the stored one. */
	save: ({ clientSecret, ...input }: SsoSettingsInput): Promise<SsoConnection> =>
		api(endpoints.sso.connection, {
			method: "PUT",
			body: { ...input, ...(clientSecret ? { clientSecret } : {}) },
			schema: ssoConnectionSchema,
		}),

	/** Looks up each waiting domain's DNS record. */
	verify: (): Promise<SsoConnection> =>
		api(endpoints.sso.verify, { method: "POST", schema: ssoConnectionSchema }),

	remove: (): Promise<null> =>
		api(endpoints.sso.connection, { method: "DELETE", schema: z.null() }),
};
