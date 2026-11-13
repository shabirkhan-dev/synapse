import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { EVAL_MESSAGES } from "../constants/evaluations.constants";
import {
	addQuestionBodySchema,
	evalIdParamsSchema,
	evalQuestionSchema,
	evalRunSchema,
	evalRunSummarySchema,
	runBodySchema,
} from "../schemas/evaluations.schemas";
import type { EvaluationsService } from "../services/evaluations.service";

const tags = ["Evaluations"];
const security = [{ bearerAuth: [] }];
const json = <T extends z.ZodType>(schema: T, description: string) => ({
	description,
	content: { "application/json": { schema: successEnvelope(schema) } },
});
const notFound = {
	404: {
		description: "Not found in the active organization",
		content: { "application/json": { schema: apiErrorSchema } },
	},
} as const;

const listQuestionsRoute = createRoute({
	method: "get",
	path: "/questions",
	tags,
	summary: "The organization's evaluation questions, oldest first",
	security,
	responses: { 200: json(z.array(evalQuestionSchema), "Questions"), ...errorResponses },
});

const addQuestionRoute = createRoute({
	method: "post",
	path: "/questions",
	tags,
	summary: "Add a question and the documents that should answer it (at most 50 questions)",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: addQuestionBodySchema } } },
	},
	responses: {
		201: json(evalQuestionSchema, "Question added"),
		409: {
			description: "The organization already has the maximum number of questions",
			content: { "application/json": { schema: apiErrorSchema } },
		},
		...errorResponses,
	},
});

const deleteQuestionRoute = createRoute({
	method: "delete",
	path: "/questions/{id}",
	tags,
	summary: "Delete a question (past runs keep their copy)",
	security,
	request: { params: evalIdParamsSchema },
	responses: { 200: json(z.object({ id: z.uuid() }), "Deleted"), ...notFound, ...errorResponses },
});

const runRoute = createRoute({
	method: "post",
	path: "/runs",
	tags,
	summary: "Run every question through each search mode and store recall@k and MRR",
	security,
	request: { body: { required: true, content: { "application/json": { schema: runBodySchema } } } },
	responses: { 201: json(evalRunSchema, "Run stored"), ...errorResponses },
});

const listRunsRoute = createRoute({
	method: "get",
	path: "/runs",
	tags,
	summary: "Recent runs (newest first, without per-question results)",
	security,
	responses: { 200: json(z.array(evalRunSummarySchema), "Runs"), ...errorResponses },
});

const getRunRoute = createRoute({
	method: "get",
	path: "/runs/{id}",
	tags,
	summary: "A run with the rank of each question's expected document per mode",
	security,
	request: { params: evalIdParamsSchema },
	responses: { 200: json(evalRunSchema, "Run"), ...notFound, ...errorResponses },
});

export function createEvaluationRoutes(evaluations: EvaluationsService) {
	const app = new OpenAPIHono<AppBindings>();
	const scope = (c: Context<AppBindings>) => ({
		ownerId: c.get("user").orgId,
		actorId: c.get("user").sub,
		context: { requestId: c.get("requestId"), actorId: c.get("user").sub },
	});

	app.openapi(listQuestionsRoute, async (c) => {
		const questions = await evaluations.listQuestions(c.get("user").orgId);
		return success(c, questions, EVAL_MESSAGES.QUESTIONS_FETCHED);
	});

	app.openapi(addQuestionRoute, async (c) => {
		const question = await evaluations.addQuestion(scope(c), c.req.valid("json"));
		return success(c, question, EVAL_MESSAGES.QUESTION_ADDED, HTTP_STATUS.CREATED);
	});

	app.openapi(deleteQuestionRoute, async (c) => {
		const { id } = c.req.valid("param");
		await evaluations.removeQuestion(c.get("user").orgId, id);
		return success(c, { id }, EVAL_MESSAGES.QUESTION_DELETED);
	});

	app.openapi(runRoute, async (c) => {
		const run = await evaluations.run(scope(c), c.req.valid("json").k);
		return success(c, run, EVAL_MESSAGES.RUN_COMPLETED, HTTP_STATUS.CREATED);
	});

	app.openapi(listRunsRoute, async (c) => {
		const runs = await evaluations.listRuns(c.get("user").orgId);
		return success(c, runs, EVAL_MESSAGES.RUNS_FETCHED);
	});

	app.openapi(getRunRoute, async (c) => {
		const run = await evaluations.getRun(c.get("user").orgId, c.req.valid("param").id);
		return success(c, run, EVAL_MESSAGES.RUN_FETCHED);
	});

	return app;
}
