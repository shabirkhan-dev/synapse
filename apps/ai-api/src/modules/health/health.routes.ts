import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { apiErrorSchema, errorBody, success, successEnvelope } from "@/common/api-response";
import type { AppBindings } from "@/common/app-types";

const healthSchema = z
	.object({
		status: z.literal("ok"),
		service: z.string(),
		uptimeSeconds: z.number(),
	})
	.openapi("Health");

const readinessSchema = z
	.object({
		status: z.literal("ok"),
		service: z.string(),
		database: z.literal("ok"),
	})
	.openapi("Readiness");

const healthRoute = createRoute({
	method: "get",
	path: "/",
	tags: ["Health"],
	summary: "Liveness probe (no dependencies)",
	responses: {
		200: {
			description: "Service is up",
			content: { "application/json": { schema: successEnvelope(healthSchema) } },
		},
	},
});

const readyRoute = createRoute({
	method: "get",
	path: "/ready",
	tags: ["Health"],
	summary: "Readiness probe (checks Postgres)",
	responses: {
		200: {
			description: "Database reachable",
			content: { "application/json": { schema: successEnvelope(readinessSchema) } },
		},
		503: {
			description: "Database unreachable",
			content: { "application/json": { schema: apiErrorSchema } },
		},
	},
});

export function createHealthRoutes({
	serviceName,
	pingDatabase,
}: {
	serviceName: string;
	pingDatabase: () => Promise<void>;
}) {
	const startedAt = Date.now();
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(healthRoute, (c) =>
		success(c, {
			status: "ok" as const,
			service: serviceName,
			uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
		}),
	);

	app.openapi(readyRoute, async (c) => {
		try {
			await pingDatabase();
		} catch {
			return c.json(errorBody(c, 503, "DATABASE_UNAVAILABLE", "Database is not reachable"), 503);
		}
		return success(
			c,
			{ status: "ok" as const, service: serviceName, database: "ok" as const },
			200,
		);
	});

	return app;
}
