import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { OVERSIGHT_MESSAGES } from "../constants/oversight.constants";
import {
	answerFeedbackSchema,
	approvalIdParamsSchema,
	approvalRequestSchema,
	decisionResultSchema,
	feedbackBodySchema,
	rejectBodySchema,
} from "../schemas/oversight.schemas";
import type { OversightService } from "../services/oversight.service";

const tags = ["Oversight"];
const security = [{ bearerAuth: [] }];

const decisionErrors = {
	404: {
		description: "No such request for this user",
		content: { "application/json": { schema: apiErrorSchema } },
	},
	409: {
		description: "Already decided the other way",
		content: { "application/json": { schema: apiErrorSchema } },
	},
} as const;

const pendingRoute = createRoute({
	method: "get",
	path: "/approvals",
	tags,
	summary: "Your approval requests waiting for a decision (newest first)",
	security,
	responses: {
		200: {
			description: "Pending requests",
			content: { "application/json": { schema: successEnvelope(z.array(approvalRequestSchema)) } },
		},
		...errorResponses,
	},
});

const approveRoute = createRoute({
	method: "post",
	path: "/approvals/{id}/approve",
	tags,
	summary: "Approve a request; the paused action runs and its result is returned",
	security,
	request: { params: approvalIdParamsSchema },
	responses: {
		200: {
			description: "Approved; `outcome.result` is the action's result",
			content: { "application/json": { schema: successEnvelope(decisionResultSchema) } },
		},
		...decisionErrors,
		...errorResponses,
	},
});

const rejectRoute = createRoute({
	method: "post",
	path: "/approvals/{id}/reject",
	tags,
	summary: "Reject a request; the action never runs",
	security,
	request: {
		params: approvalIdParamsSchema,
		body: { required: false, content: { "application/json": { schema: rejectBodySchema } } },
	},
	responses: {
		200: {
			description: "Rejected",
			content: { "application/json": { schema: successEnvelope(decisionResultSchema) } },
		},
		...decisionErrors,
		...errorResponses,
	},
});

const feedbackRoute = createRoute({
	method: "post",
	path: "/feedback",
	tags,
	summary: "Rate an answer (thumbs up/down); rating the same request again replaces it",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: feedbackBodySchema } } },
	},
	responses: {
		200: {
			description: "Feedback stored",
			content: { "application/json": { schema: successEnvelope(answerFeedbackSchema) } },
		},
		...errorResponses,
	},
});

export function createOversightRoutes(oversight: OversightService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(pendingRoute, async (c) => {
		const pending = await oversight.pending(c.get("user").sub);
		return success(c, pending, OVERSIGHT_MESSAGES.APPROVALS_FETCHED);
	});

	app.openapi(approveRoute, async (c) => {
		const result = await oversight.decide(
			c.req.valid("param").id,
			c.get("user"),
			{ approved: true },
			{ requestId: c.get("requestId") },
		);
		return success(c, result, OVERSIGHT_MESSAGES.APPROVED);
	});

	app.openapi(rejectRoute, async (c) => {
		const body = c.req.valid("json") ?? {};
		const result = await oversight.decide(
			c.req.valid("param").id,
			c.get("user"),
			{ approved: false, reason: body.reason },
			{ requestId: c.get("requestId") },
		);
		return success(c, result, OVERSIGHT_MESSAGES.REJECTED);
	});

	app.openapi(feedbackRoute, async (c) => {
		const feedback = await oversight.recordFeedback(c.get("user").sub, c.req.valid("json"));
		return success(c, feedback, OVERSIGHT_MESSAGES.FEEDBACK_RECORDED, HTTP_STATUS.OK);
	});

	return app;
}
