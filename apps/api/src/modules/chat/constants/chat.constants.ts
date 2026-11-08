export const CHAT_ERROR_CODES = {
	INVALID_MESSAGES: "CHAT_INVALID_MESSAGES",
} as const;

export const CHAT_MESSAGES = {
	BODY_SHAPE:
		"Send either `messages` (stateless chat) or `message` (one new message in a stored conversation)",
	CONVERSATION_NEEDS_MESSAGE: "`conversationId` goes with `message`, not `messages`",
} as const;

export const CHAT_MAX_MESSAGES = 200;

/** Response header naming the stored conversation (new or continued). */
export const CONVERSATION_ID_HEADER = "x-conversation-id";
