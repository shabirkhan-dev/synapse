import { z } from "zod";

export const auditEventSchema = z.object({
	id: z.string(),
	actorId: z.string(),
	action: z.string(),
	subjectType: z.string(),
	subjectId: z.string().nullable(),
	requestId: z.string().nullable(),
	data: z.record(z.string(), z.unknown()),
	createdAt: z.string(),
});

export const auditEventListSchema = z.array(auditEventSchema);
