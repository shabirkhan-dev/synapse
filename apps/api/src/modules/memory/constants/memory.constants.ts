export const MEMORY_ERROR_CODES = {
	CONVERSATION_NOT_FOUND: "MEMORY_CONVERSATION_NOT_FOUND",
	FACT_NOT_FOUND: "MEMORY_FACT_NOT_FOUND",
	NOTHING_TO_REGENERATE: "MEMORY_NOTHING_TO_REGENERATE",
} as const;

export const MEMORY_MESSAGES = {
	CONVERSATIONS_FETCHED: "Conversations retrieved",
	CONVERSATION_FETCHED: "Conversation retrieved",
	CONVERSATION_DELETED: "Conversation deleted",
	CONVERSATION_NOT_FOUND: "Conversation not found",
	FACTS_FETCHED: "Remembered facts retrieved",
	FACT_SAVED: "Fact remembered",
	FACT_DELETED: "Fact forgotten",
	FACT_NOT_FOUND: "Fact not found",
	NOTHING_TO_REGENERATE: "This conversation has no question to answer again",
	FORGOTTEN: "All conversations and remembered facts deleted",
} as const;

export const MEMORY_LIST_LIMIT = 100;
/** Conversation titles: the first words of the first message. */
export const CONVERSATION_TITLE_LENGTH = 80;
