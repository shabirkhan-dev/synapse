import { z } from "@hono/zod-openapi";

export const apiKeySchema = z
	.object({
		id: z.uuid(),
		name: z.string(),
		prefix: z.string().openapi({ example: "syn_Ab12Cd34" }),
		organizationId: z.string(),
		expiresAt: z.string().nullable(),
		lastUsedAt: z.string().nullable(),
		createdAt: z.string(),
	})
	.openapi("ApiKey");

export const createApiKeyBodySchema = z
	.object({
		name: z.string().trim().min(1).max(80).openapi({ example: "Nightly import" }),
		/** Omit for a key that does not expire. */
		expiresInDays: z.number().int().min(1).max(365).optional(),
	})
	.openapi("CreateApiKeyBody");

export const createdApiKeySchema = z
	.object({
		apiKey: apiKeySchema,
		/** The key itself: send it as `Authorization: Bearer syn_…`. Shown only in this response. */
		key: z.string(),
	})
	.openapi("CreatedApiKey");

export const apiKeyIdParamsSchema = z.object({
	id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});
