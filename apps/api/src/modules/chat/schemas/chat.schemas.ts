import { z } from "@hono/zod-openapi";

import { CHAT_MAX_MESSAGES, CHAT_MESSAGES } from "../constants/chat.constants";

const uiMessage = z.record(z.string(), z.unknown());

export const chatBodySchema = z
	.object({
		/** Stateless: the whole AI SDK UI message list, as sent by `useChat`. Nothing is stored. */
		messages: z.array(uiMessage).min(1).max(CHAT_MAX_MESSAGES).optional(),
		/** Stored: one new UI message; the server keeps and replays the history. */
		message: uiMessage.optional(),
		/** Continue this conversation; omit to start one (its id comes back in `x-conversation-id`). */
		conversationId: z.uuid().optional(),
	})
	.refine((body) => Boolean(body.messages) !== Boolean(body.message), {
		message: CHAT_MESSAGES.BODY_SHAPE,
	})
	.refine((body) => !body.conversationId || Boolean(body.message), {
		message: CHAT_MESSAGES.CONVERSATION_NEEDS_MESSAGE,
	})
	.openapi("ChatBody");

export type ChatBody = z.infer<typeof chatBodySchema>;
