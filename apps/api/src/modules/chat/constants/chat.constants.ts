export const CHAT_ERROR_CODES = {
	INVALID_MESSAGES: "CHAT_INVALID_MESSAGES",
} as const;

export const CHAT_MESSAGES = {
	BODY_SHAPE:
		"Send one of `messages` (stateless chat), `message` (one new message in a stored conversation) or `regenerate`",
	CONVERSATION_NEEDS_MESSAGE:
		"`conversationId` goes with `message` or `regenerate`, not `messages`",
	REGENERATE_NEEDS_CONVERSATION: "`regenerate` needs the `conversationId` to answer again",
} as const;

export const CHAT_MAX_MESSAGES = 200;

/** Response header naming the stored conversation (new or continued). */
export const CONVERSATION_ID_HEADER = "x-conversation-id";

/** What each chat tool does, as the model reads it (and as the Agents page shows it). */
export const CHAT_TOOLS = {
	searchDocuments: {
		description:
			"Search the user's ingested documents (vector search). Use it before answering questions about their documents.",
	},
	rememberFact: {
		description:
			"Save a short fact about the user for future conversations. Use only when the user explicitly asks you to remember something.",
	},
	currentTime: {
		description:
			"Get the current date and time, optionally in an IANA time zone such as Asia/Karachi.",
	},
} as const;
