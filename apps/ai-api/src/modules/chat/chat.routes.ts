import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
	convertToModelMessages,
	isStepCount,
	safeValidateUIMessages,
	streamText,
	type LanguageModel,
	type UIMessage,
} from "ai";

import { errorResponses } from "@/common/api-response";
import { AppError } from "@/common/app-error";
import type { AppBindings } from "@/common/app-types";
import type { RagService } from "@/modules/rag/rag.service";

import { createChatTools } from "./chat.tools";

export const chatSystemPrompt = [
	"You are the Starter AI assistant.",
	"Use the `searchDocuments` tool to ground answers about the user's documents and cite the document title.",
	"Use the `currentTime` tool for anything that depends on today's date or time.",
	"If the tools do not return the answer, say you do not know.",
].join("\n");

const chatBodySchema = z
	.object({
		/** AI SDK UI messages, as sent by `useChat` / `DefaultChatTransport`. */
		messages: z.array(z.record(z.string(), z.unknown())).min(1).max(200),
	})
	.openapi("ChatBody");

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

export function createChatRoutes({
	rag,
	chatModel,
	maxSteps,
	topK,
}: {
	rag: RagService;
	chatModel: LanguageModel;
	maxSteps: number;
	topK: number;
}) {
	const app = new OpenAPIHono<AppBindings>();

	app.openapi(chatRoute, async (c) => {
		const { messages } = c.req.valid("json");
		const validated = await safeValidateUIMessages<UIMessage>({ messages });
		if (!validated.success) {
			throw new AppError(422, "CHAT_INVALID_MESSAGES", validated.error.message);
		}
		const tools = createChatTools({ rag, ownerId: c.get("user").sub, topK });
		const result = streamText({
			model: chatModel,
			system: chatSystemPrompt,
			messages: await convertToModelMessages(validated.data, { tools }),
			tools,
			toolChoice: "auto",
			stopWhen: isStepCount(maxSteps),
			abortSignal: c.req.raw.signal,
		});
		return result.toUIMessageStreamResponse({
			headers: { "x-request-id": c.get("requestId") },
		});
	});

	return app;
}
