/** The API returns the id of a conversation it just started in this response header. */
export const CONVERSATION_ID_HEADER = "x-conversation-id";

/** The search parameter that holds the open conversation (`/chat?c=<id>`). */
export const CONVERSATION_PARAM = "c";

export const CHAT_ROUTE = "/chat";

/** Questions offered on an empty chat; each one is sent as written. */
export const SUGGESTIONS = [
	"Summarize what my documents say about refunds",
	"Which documents mention deadlines?",
	"Remember that I prefer short answers",
] as const;

/** Plain words for the tools the assistant can call (`apps/api` chat tools). */
export const TOOL_LABELS: Record<string, { running: string; done: string; failed: string }> = {
	searchDocuments: {
		running: "Searching your documents",
		done: "Searched your documents",
		failed: "Document search failed",
	},
	rememberFact: { running: "Remembering", done: "Remembered", failed: "Could not remember that" },
	currentTime: {
		running: "Checking the time",
		done: "Checked the time",
		failed: "Time unavailable",
	},
};
