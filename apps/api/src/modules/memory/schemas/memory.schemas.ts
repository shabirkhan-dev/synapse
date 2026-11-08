import { z } from "@hono/zod-openapi";

export const memoryIdParamsSchema = z.object({
	id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
});

export const rememberBodySchema = z
	.object({
		content: z.string().trim().min(1).max(500).openapi({ example: "I prefer metric units" }),
	})
	.openapi("RememberBody");

export const conversationSchema = z
	.object({ id: z.uuid(), title: z.string(), createdAt: z.string(), updatedAt: z.string() })
	.openapi("Conversation");

export const conversationWithMessagesSchema = conversationSchema
	.extend({
		messages: z.array(
			z.object({
				id: z.string(),
				role: z.enum(["system", "user", "assistant"]),
				/** The AI SDK UI message, as streamed. */
				message: z.record(z.string(), z.unknown()),
				createdAt: z.string(),
			}),
		),
	})
	.openapi("ConversationWithMessages");

export const memoryFactSchema = z
	.object({ id: z.uuid(), content: z.string(), createdAt: z.string() })
	.openapi("MemoryFact");

export const forgottenSchema = z
	.object({ conversations: z.number().int(), facts: z.number().int() })
	.openapi("Forgotten");
