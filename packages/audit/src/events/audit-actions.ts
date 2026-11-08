/** Every action name the system records. Add new ones here so the history stays searchable. */
export const AUDIT_ACTIONS = {
	RAG_QUERY_ANSWERED: "rag.query.answered",
	RAG_DOCUMENT_INGESTED: "rag.document.ingested",
	RAG_DOCUMENT_DELETED: "rag.document.deleted",
	RAG_DOCUMENTS_PURGED: "rag.documents.purged",
	AUTH_SIGNED_UP: "auth.user.signed_up",
	AUTH_SIGNED_IN: "auth.user.signed_in",
	AUTH_SIGNED_OUT: "auth.session.signed_out",
	AUTH_PASSWORD_RESET: "auth.password.reset",
	AUTH_EMAIL_VERIFIED: "auth.email.verified",
	OVERSIGHT_APPROVAL_REQUESTED: "oversight.approval.requested",
	OVERSIGHT_APPROVAL_DECIDED: "oversight.approval.decided",
} as const;

/** Actor for work no user did directly (approved actions, jobs). */
export const SYSTEM_ACTOR = "system";
