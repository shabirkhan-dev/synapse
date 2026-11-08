import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { HTTP_STATUS } from "@/shared/constants/http-status";
import { errorResponses } from "@/shared/responses/error-response";
import { apiErrorSchema, successEnvelope } from "@/shared/responses/response.types";
import { success } from "@/shared/responses/success-response";
import type { AppBindings } from "@/shared/types/app-types";

import { MEMORY_MESSAGES } from "../constants/memory.constants";
import {
	conversationSchema,
	conversationWithMessagesSchema,
	forgottenSchema,
	memoryFactSchema,
	memoryIdParamsSchema,
	rememberBodySchema,
} from "../schemas/memory.schemas";
import type { MemoryService } from "../services/memory.service";

const tags = ["Memory"];
const security = [{ bearerAuth: [] }];
const notFound = {
	404: {
		description: "Not found for this user",
		content: { "application/json": { schema: apiErrorSchema } },
	},
} as const;
const ctx = (requestId: string) => ({ requestId });
const json = <T extends z.ZodType>(schema: T, description: string) => ({
	description,
	content: { "application/json": { schema: successEnvelope(schema) } },
});

const listConversationsRoute = createRoute({
	method: "get",
	path: "/conversations",
	tags,
	summary: "Your conversations, most recently active first",
	security,
	responses: { 200: json(z.array(conversationSchema), "Conversations"), ...errorResponses },
});

const getConversationRoute = createRoute({
	method: "get",
	path: "/conversations/{id}",
	tags,
	summary: "A conversation with all its messages (to restore a chat)",
	security,
	request: { params: memoryIdParamsSchema },
	responses: {
		200: json(conversationWithMessagesSchema, "Conversation"),
		...notFound,
		...errorResponses,
	},
});

const deleteConversationRoute = createRoute({
	method: "delete",
	path: "/conversations/{id}",
	tags,
	summary: "Delete a conversation and its messages",
	security,
	request: { params: memoryIdParamsSchema },
	responses: { 200: json(z.object({ id: z.uuid() }), "Deleted"), ...notFound, ...errorResponses },
});

const listFactsRoute = createRoute({
	method: "get",
	path: "/facts",
	tags,
	summary: "Facts the assistant remembers about you, newest first",
	security,
	responses: { 200: json(z.array(memoryFactSchema), "Facts"), ...errorResponses },
});

const rememberRoute = createRoute({
	method: "post",
	path: "/facts",
	tags,
	summary: "Remember a fact (the same text twice is stored once)",
	security,
	request: {
		body: { required: true, content: { "application/json": { schema: rememberBodySchema } } },
	},
	responses: { 201: json(memoryFactSchema, "Remembered"), ...errorResponses },
});

const forgetFactRoute = createRoute({
	method: "delete",
	path: "/facts/{id}",
	tags,
	summary: "Forget one fact",
	security,
	request: { params: memoryIdParamsSchema },
	responses: { 200: json(z.object({ id: z.uuid() }), "Forgotten"), ...notFound, ...errorResponses },
});

const forgetEverythingRoute = createRoute({
	method: "delete",
	path: "/",
	tags,
	summary: "Delete all your conversations and remembered facts",
	security,
	responses: { 200: json(forgottenSchema, "Counts of what was deleted"), ...errorResponses },
});

export function createMemoryRoutes(memory: MemoryService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(listConversationsRoute, async (c) => {
		const conversations = await memory.listConversations(c.get("user").sub);
		return success(c, conversations, MEMORY_MESSAGES.CONVERSATIONS_FETCHED);
	});

	app.openapi(getConversationRoute, async (c) => {
		const conversation = await memory.getConversation(c.get("user").sub, c.req.valid("param").id);
		return success(c, conversation, MEMORY_MESSAGES.CONVERSATION_FETCHED);
	});

	app.openapi(deleteConversationRoute, async (c) => {
		const { id } = c.req.valid("param");
		await memory.deleteConversation(c.get("user").sub, id, ctx(c.get("requestId")));
		return success(c, { id }, MEMORY_MESSAGES.CONVERSATION_DELETED);
	});

	app.openapi(listFactsRoute, async (c) => {
		const facts = await memory.listFacts(c.get("user").sub);
		return success(c, facts, MEMORY_MESSAGES.FACTS_FETCHED);
	});

	app.openapi(rememberRoute, async (c) => {
		const { content } = c.req.valid("json");
		const fact = await memory.rememberFact(c.get("user").sub, content, ctx(c.get("requestId")));
		return success(c, fact, MEMORY_MESSAGES.FACT_SAVED, HTTP_STATUS.CREATED);
	});

	app.openapi(forgetFactRoute, async (c) => {
		const { id } = c.req.valid("param");
		await memory.forgetFact(c.get("user").sub, id, ctx(c.get("requestId")));
		return success(c, { id }, MEMORY_MESSAGES.FACT_DELETED);
	});

	app.openapi(forgetEverythingRoute, async (c) => {
		const counts = await memory.forgetEverything(c.get("user").sub, ctx(c.get("requestId")));
		return success(c, counts, MEMORY_MESSAGES.FORGOTTEN);
	});

	return app;
}
