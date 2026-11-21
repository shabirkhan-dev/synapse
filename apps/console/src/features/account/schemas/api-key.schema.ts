import { z } from "zod";

export const apiKeySchema = z.object({
	id: z.string(),
	name: z.string(),
	prefix: z.string(),
	organizationId: z.string(),
	expiresAt: z.string().nullable(),
	lastUsedAt: z.string().nullable(),
	createdAt: z.string(),
});
export const apiKeyListSchema = z.array(apiKeySchema);

/** `POST /auth/api-keys`: the key itself is only in this answer. */
export const createdApiKeySchema = z.object({ apiKey: apiKeySchema, key: z.string() });

export const createApiKeyFormSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name the key (what will use it?)")
		.max(80, "At most 80 characters"),
});
