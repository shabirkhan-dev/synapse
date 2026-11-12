import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AuditLog } from "@synapse/audit";
import { can } from "@synapse/security";

import { errorResponses } from "@/shared/responses/error-response";
import { successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { AUDIT_MESSAGES } from "../constants/audit.constants";
import {
	auditEventSchema,
	listAuditEventsQuerySchema,
	usageQuerySchema,
	usageSchema,
} from "../schemas/audit.schemas";
import type { UsageService } from "../services/usage.service";

const listRoute = createRoute({
	method: "get",
	path: "/events",
	tags: ["Audit"],
	summary: "Your event history, newest first (answers with provenance, ingests, deletes, sign-ins)",
	security: [{ bearerAuth: [] }],
	request: { query: listAuditEventsQuerySchema },
	responses: {
		200: {
			description: "Events (personal data in `data` is redacted)",
			content: { "application/json": { schema: successEnvelope(z.array(auditEventSchema)) } },
		},
		...errorResponses,
	},
});

const usageRoute = createRoute({
	method: "get",
	path: "/usage",
	tags: ["Audit"],
	summary:
		"Answers, tokens and estimated cost per day and by model / prompt version (organization for admins, your own for members)",
	security: [{ bearerAuth: [] }],
	request: { query: usageQuerySchema },
	responses: {
		200: {
			description: "Usage over the last `days` UTC days",
			content: { "application/json": { schema: successEnvelope(usageSchema) } },
		},
		...errorResponses,
	},
});

export function createAuditRoutes(audit: AuditLog, usage: UsageService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(listRoute, async (c) => {
		const { limit, action } = c.req.valid("query");
		const user = c.get("user");
		// Admins see the organization's whole history; members only their own actions.
		const events = await audit.list(user.orgId, {
			limit,
			...(action ? { action } : {}),
			...(can(user.role, "audit.read_all") ? {} : { actorId: user.sub }),
		});
		return success(
			c,
			events.map(({ ownerId: _ownerId, ...event }) => event),
			AUDIT_MESSAGES.EVENTS_FETCHED,
		);
	});

	app.openapi(usageRoute, async (c) => {
		const summary = await usage.summarize(c.get("user"), c.req.valid("query").days);
		return success(c, summary, AUDIT_MESSAGES.USAGE_FETCHED);
	});

	return app;
}
