import { z } from "zod";

export const conversationSchema = z.object({
	id: z.string(),
	title: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export const conversationListSchema = z.array(conversationSchema);

/** The stored AI SDK UI message: checked for the fields the console renders, the rest kept. */
const uiMessageSchema = z.looseObject({
	id: z.string(),
	role: z.enum(["system", "user", "assistant"]),
	parts: z.array(z.looseObject({ type: z.string() })),
});

export const conversationWithMessagesSchema = conversationSchema.extend({
	messages: z.array(z.object({ id: z.string(), message: uiMessageSchema })),
});

export const deletedConversationSchema = z.unknown();

export const messageFormSchema = z.object({
	text: z
		.string()
		.trim()
		.min(1, "Type a message to send.")
		.max(8000, "Use at most 8000 characters"),
});
