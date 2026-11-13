export const AGENT_MESSAGES = {
	OVERVIEW_FETCHED: "Agents retrieved",
	RUNS_FETCHED: "Agent runs retrieved",
} as const;

export const AGENT_RUN_LIMIT = 25;

/** Actions an assistant or a member can only take once an admin or owner approves. */
export const APPROVAL_ACTION_LABELS: Record<string, string> = {
	"rag.purge-documents": "Delete all documents",
};
