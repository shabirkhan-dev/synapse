import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorResponses } from "@/shared/responses/error-response";
import type { AppBindings } from "@/shared/types/app-types";

import { chatBodySchema } from "../schemas/chat.schemas";
import type { ChatService } from "../services/chat.service";

const chatRoute = createRoute({
	method: "post",
	path: "/",
	tags: ["Chat"],
	summary: "Streaming, tool-calling chat (AI SDK UI message stream, SSE)",
	security: [{ bearerAuth: [] }],
	request: {
		body: { required: true, content: { "application/json": { schema: chatBodySchema } } },
	},
	responses: {
		200: {
			description: "Server-sent events in the AI SDK UI message stream protocol",
			content: { "text/event-stream": { schema: z.string() } },
		},
		...errorResponses,
	},
});

export function createChatRoutes(chat: ChatService) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(chatRoute, async (c) => {
		const result = await chat.streamReply({
			ownerId: c.get("user").sub,
			messages: c.req.valid("json").messages,
			abortSignal: c.req.raw.signal,
		});
		return result.toUIMessageStreamResponse({
			headers: { "x-request-id": c.get("requestId") },
		});
	});

	return app;
}
