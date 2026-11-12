/** How many events the activity page shows (the API allows up to 200). */
export const ACTIVITY_LIMIT = 50;

/** Plain words for the audit actions (`AUDIT_ACTIONS` in `@synapse/audit`). */
export const ACTION_LABELS: Record<string, string> = {
	"rag.query.answered": "Answered a question",
	"rag.document.ingested": "Added a document",
	"rag.document.deleted": "Deleted a document",
	"rag.documents.purged": "Deleted all documents",
	"auth.user.signed_up": "Created the account",
	"auth.user.signed_in": "Signed in",
	"auth.session.signed_out": "Signed out",
	"auth.sessions.revoked": "Signed out other devices",
	"auth.password.reset": "Reset the password",
	"auth.email.verified": "Verified the email",
	"auth.session.organization_switched": "Switched organization",
	"oversight.approval.requested": "Asked for approval",
	"oversight.approval.decided": "Decided an approval",
	"memory.fact.saved": "Saved a memory",
	"memory.fact.forgotten": "Forgot a memory",
	"memory.conversation.deleted": "Deleted a conversation",
	"memory.all.forgotten": "Cleared all memory",
	"guardrails.input.blocked": "Input blocked by policy",
	"guardrails.passages.flagged": "Instructions removed from passages",
	"guardrails.output.redacted": "Secrets removed from an answer",
	"organization.created": "Created an organization",
	"organization.member.saved": "Changed a member",
	"organization.member.removed": "Removed a member",
};
