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
	MEMORY_FACT_SAVED: "memory.fact.saved",
	MEMORY_FACT_FORGOTTEN: "memory.fact.forgotten",
	MEMORY_CONVERSATION_DELETED: "memory.conversation.deleted",
	MEMORY_ALL_FORGOTTEN: "memory.all.forgotten",
	GUARDRAILS_INPUT_BLOCKED: "guardrails.input.blocked",
	GUARDRAILS_PASSAGES_FLAGGED: "guardrails.passages.flagged",
	GUARDRAILS_OUTPUT_REDACTED: "guardrails.output.redacted",
	ORGANIZATION_CREATED: "organization.created",
	ORGANIZATION_MEMBER_SAVED: "organization.member.saved",
	ORGANIZATION_MEMBER_REMOVED: "organization.member.removed",
	AUTH_ORGANIZATION_SWITCHED: "auth.session.organization_switched",
} as const;

/** Actor for work no user did directly (approved actions, jobs). */
export const SYSTEM_ACTOR = "system";
