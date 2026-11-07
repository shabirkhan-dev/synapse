import { z } from "@hono/zod-openapi";

export const healthSchema = z
	.object({
		status: z.literal("ok"),
		service: z.string(),
		uptimeSeconds: z.number(),
	})
	.openapi("Health");

export const readinessSchema = z
	.object({
		status: z.literal("ok"),
		service: z.string(),
		database: z.literal("ok"),
	})
	.openapi("Readiness");
