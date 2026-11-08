import { z } from "@hono/zod-openapi";

import { AUDIT_DEFAULT_LIMIT, AUDIT_MAX_LIMIT } from "../constants/audit.constants";

export const listAuditEventsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(AUDIT_MAX_LIMIT).default(AUDIT_DEFAULT_LIMIT),
	action: z.string().min(1).max(100).optional().openapi({ example: "rag.query.answered" }),
});

export const auditEventSchema = z
	.object({
		id: z.uuid(),
		actorId: z.string(),
		action: z.string(),
		subjectType: z.string(),
		subjectId: z.string().nullable(),
		requestId: z.string().nullable(),
		data: z.record(z.string(), z.unknown()),
		provenance: z.record(z.string(), z.unknown()).nullable(),
		createdAt: z.string(),
	})
	.openapi("AuditEvent");
