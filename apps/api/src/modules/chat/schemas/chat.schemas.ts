import { z } from "@hono/zod-openapi";

import { RAG_MAX_SCOPE_DOCUMENTS } from "@/modules/rag";

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
		/** Answer the conversation's last question again, replacing the reply after it. */
		regenerate: z.literal(true).optional(),
		/** This turn's document search reads only these documents of the organization. */
		documentIds: z.array(z.uuid()).min(1).max(RAG_MAX_SCOPE_DOCUMENTS).optional(),
	})
	.refine((body) => [body.messages, body.message, body.regenerate].filter(Boolean).length === 1, {
		message: CHAT_MESSAGES.BODY_SHAPE,
	})
	.refine((body) => !body.conversationId || Boolean(body.message ?? body.regenerate), {
		message: CHAT_MESSAGES.CONVERSATION_NEEDS_MESSAGE,
	})
	.refine((body) => !body.regenerate || Boolean(body.conversationId), {
		message: CHAT_MESSAGES.REGENERATE_NEEDS_CONVERSATION,
	})
	.openapi("ChatBody");

export type ChatBody = z.infer<typeof chatBodySchema>;
