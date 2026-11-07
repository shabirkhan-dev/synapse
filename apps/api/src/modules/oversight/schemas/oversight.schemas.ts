import { z } from "@hono/zod-openapi";

export const approvalIdParamsSchema = z.object({
	id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const rejectBodySchema = z
	.object({ reason: z.string().trim().max(1000).optional() })
	.openapi("RejectBody");

export const feedbackBodySchema = z
	.object({
		/** `x-request-id` of the answered `/rag/query` call. */
		requestId: z.string().min(1).max(128).openapi({ example: "req_7f3c..." }),
		rating: z.enum(["up", "down"]),
		comment: z.string().max(2000).optional(),
	})
	.openapi("FeedbackBody");

export const approvalRequestSchema = z
	.object({
		id: z.uuid(),
		ownerId: z.string(),
		action: z.string(),
		summary: z.string(),
		status: z.enum(["pending", "approved", "rejected"]),
		reason: z.string().nullable(),
		decidedBy: z.string().nullable(),
		decidedAt: z.string().nullable(),
		createdAt: z.string(),
	})
	.openapi("ApprovalRequest");

export const actionOutcomeSchema = z
	.object({
		status: z.enum(["awaiting_approval", "rejected", "done"]),
		approvalId: z.uuid(),
		result: z.unknown().optional(),
	})
	.openapi("ActionOutcome");

export const decisionResultSchema = z
	.object({ approval: approvalRequestSchema, outcome: actionOutcomeSchema })
	.openapi("DecisionResult");

export const answerFeedbackSchema = z
	.object({
		requestId: z.string(),
		rating: z.enum(["up", "down"]),
		comment: z.string().nullable(),
		createdAt: z.string(),
	})
	.openapi("AnswerFeedback");
