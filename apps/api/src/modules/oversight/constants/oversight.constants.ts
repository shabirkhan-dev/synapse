export const OVERSIGHT_API_ERROR_CODES = {
	APPROVAL_NOT_FOUND: "OVERSIGHT_APPROVAL_NOT_FOUND",
	APPROVAL_ALREADY_DECIDED: "OVERSIGHT_APPROVAL_ALREADY_DECIDED",
	FORBIDDEN: "OVERSIGHT_FORBIDDEN",
} as const;

export const OVERSIGHT_MESSAGES = {
	APPROVALS_FETCHED: "Pending approvals retrieved",
	APPROVED: "Approved; the action ran",
	REJECTED: "Rejected; nothing ran",
	APPROVAL_NOT_FOUND: "Approval request not found",
	APPROVAL_ALREADY_DECIDED: "This request was already decided the other way",
	FEEDBACK_RECORDED: "Feedback recorded",
	FORBIDDEN: "Only an admin or owner of this organization can decide approval requests",
} as const;

/** Actions that wait for an approval before they run. */
export const OVERSIGHT_ACTIONS = {
	PURGE_DOCUMENTS: "rag.purge-documents",
} as const;

export const OVERSIGHT_PENDING_LIMIT = 50;
