import { z } from "@hono/zod-openapi";

import { CHAT_MAX_MESSAGES } from "../constants/chat.constants";

export const chatBodySchema = z
	.object({
		/** AI SDK UI messages, as sent by `useChat` / `DefaultChatTransport`. */
		messages: z.array(z.record(z.string(), z.unknown())).min(1).max(CHAT_MAX_MESSAGES),
	})
	.openapi("ChatBody");
