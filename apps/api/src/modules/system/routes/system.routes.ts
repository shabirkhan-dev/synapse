import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { SYSTEM_MESSAGES } from "../constants/system.constants";
import { systemStatusSchema } from "../schemas/system.schemas";
import type { SystemService } from "../services/system.service";

const statusRoute = createRoute({
	method: "get",
	path: "/status",
	tags: ["System"],
	summary: "Database, circuit breakers, background jobs, index versions and trace export",
	security: [{ bearerAuth: [] }],
	responses: {
		200: {
			description: "Status of this API process and its dependencies (no secrets)",
			content: { "application/json": { schema: successEnvelope(systemStatusSchema) } },
		},
		403: {
			description: "Members cannot see it; admins and owners can",
			content: { "application/json": { schema: apiErrorSchema } },
		},
		...errorResponses,
	},
});

export function createSystemRoutes(system: SystemService) {
	const app = new OpenAPIHono<AppBindings>();
	app.openapi(statusRoute, async (c) => {
		const status = await system.status(c.get("user"));
		return success(c, status, SYSTEM_MESSAGES.STATUS_FETCHED, HTTP_STATUS.OK);
	});
	return app;
}
