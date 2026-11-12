import { z } from "zod";

export const sessionSchema = z.object({
	id: z.string(),
	userAgent: z.string().nullable(),
	createdAt: z.string(),
	lastActiveAt: z.string(),
	expiresAt: z.string(),
	current: z.boolean(),
});
export const sessionListSchema = z.array(sessionSchema);
export const revokedSessionsSchema = z.object({ revoked: z.number() });
