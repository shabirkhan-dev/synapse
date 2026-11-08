export const GUARDRAILS_ERROR_CODES = {
	INPUT_BLOCKED: "GUARDRAILS_INPUT_BLOCKED",
} as const;

export const GUARDRAILS_MESSAGES = {
	INPUT_TOO_LONG: (limit: number) => `Input is longer than ${limit} characters`,
	INPUT_BLOCKED: "This request is not allowed by the content policy",
	INSTRUCTIONS_IN_FACT: "Facts cannot contain instructions for the assistant",
} as const;

/** Tools the chat model may call; anything else is dropped before the model sees it. */
export const CHAT_ALLOWED_TOOLS = ["searchDocuments", "rememberFact", "currentTime"] as const;

/** Where a check ran, recorded on its audit event. */
export type GuardedSurface = "rag.query" | "chat.message" | "chat.search" | "memory.fact";
