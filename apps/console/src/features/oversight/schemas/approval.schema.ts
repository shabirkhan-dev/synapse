import { z } from "zod";

export const approvalSchema = z.object({
	id: z.string(),
	action: z.string(),
	summary: z.string(),
	requestedBy: z.string().nullable(),
	status: z.enum(["pending", "approved", "rejected"]),
	reason: z.string().nullable(),
	decidedBy: z.string().nullable(),
	decidedAt: z.string().nullable(),
	createdAt: z.string(),
});

export const approvalListSchema = z.array(approvalSchema);

/** `data` of approve / reject: the decided request and what the action did. */
export const decisionResultSchema = z.object({
	approval: approvalSchema,
	outcome: z.object({
		status: z.enum(["awaiting_approval", "rejected", "done"]),
		approvalId: z.string(),
		result: z.unknown().optional(),
	}),
});

export const rejectFormSchema = z.object({
	reason: z
		.string()
		.trim()
		.max(1000, "At most 1000 characters")
		.optional()
		.transform((value) => value || undefined),
});
