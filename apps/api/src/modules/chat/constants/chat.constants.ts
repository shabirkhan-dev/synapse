export const CHAT_ERROR_CODES = {
	INVALID_MESSAGES: "CHAT_INVALID_MESSAGES",
} as const;

export const CHAT_MAX_MESSAGES = 200;

export const CHAT_SYSTEM_PROMPT = [
	"You are the Synapse AI assistant.",
	"Use the `searchDocuments` tool to ground answers about the user's documents and cite the document title.",
	"Use the `currentTime` tool for anything that depends on today's date or time.",
	"If the tools do not return the answer, say you do not know.",
].join("\n");
