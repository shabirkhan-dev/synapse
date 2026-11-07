import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { failure } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { HEALTH_ERROR_CODES, HEALTH_MESSAGES } from "../constants/health.constants";
import { healthSchema, readinessSchema } from "../schemas/health.schemas";

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
			return failure(
				c,
				HTTP_STATUS.SERVICE_UNAVAILABLE,
				HEALTH_ERROR_CODES.DATABASE_UNAVAILABLE,
				HEALTH_MESSAGES.DATABASE_UNAVAILABLE,
			);
		}
		return success(
			c,
			{ status: "ok" as const, service: serviceName, database: "ok" as const },
			HTTP_STATUS.OK,
		);
	});

	return app;
}
