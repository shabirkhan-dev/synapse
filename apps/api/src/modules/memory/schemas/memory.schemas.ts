import { z } from "@hono/zod-openapi";

import { CONVERSATION_TITLE_LENGTH } from "../constants/memory.constants";

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

export const replyVersionsSchema = z
	.object({
		/** 1-based position of the version in use (0 when none is). */
		current: z.number().int().min(0),
		total: z.number().int().min(0),
	})
	.openapi("ReplyVersions");

export const renameConversationBodySchema = z
	.object({ title: z.string().trim().min(1).max(CONVERSATION_TITLE_LENGTH) })
	.openapi("RenameConversationBody");

export const selectReplyVersionBodySchema = z
	.object({ version: z.number().int().min(1).max(1000) })
	.openapi("SelectReplyVersionBody");

export const conversationWithMessagesSchema = conversationSchema
	.extend({
		/** Versions of the last reply (regenerating keeps the earlier ones). */
		replyVersions: replyVersionsSchema,
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
