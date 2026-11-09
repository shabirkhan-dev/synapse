import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AuditLog } from "@synapse/audit";
import { can } from "@synapse/security";

import { errorResponses } from "@/shared/responses/error-response";
import { successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { AUDIT_MESSAGES } from "../constants/audit.constants";
import { auditEventSchema, listAuditEventsQuerySchema } from "../schemas/audit.schemas";

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

export function createAuditRoutes(audit: AuditLog) {
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

	return app;
}
