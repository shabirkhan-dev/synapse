/** What each approval-gated action is called in the console (`OVERSIGHT_ACTIONS` in the API). */
export const ACTION_LABELS: Record<string, string> = {
	"rag.purge-documents": "Delete all documents",
};

/** The API's code when someone without the admin or owner role tries to decide. */
export const OVERSIGHT_FORBIDDEN = "OVERSIGHT_FORBIDDEN";
