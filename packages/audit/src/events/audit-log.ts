import type { AnswerProvenance } from "@synapse/core/types";

/** Who did what to which thing, and what produced it. Rows are never changed once written. */
export type AuditEvent = {
	/** Tenant whose history this belongs to (JWT `sub` today). */
	ownerId: string;
	/** Who acted: a user id, or `system` for jobs and approved actions. */
	actorId: string;
	/** `<area>.<thing>.<verb>`, e.g. `rag.query.answered`. */
	action: string;
	subjectType: string;
	subjectId: string | null;
	/** `x-request-id` of the HTTP call, when there was one. */
	requestId: string | null;
	/** Event details. Strings are redacted (PII, secrets) before storage. */
	data: Record<string, unknown>;
	/** Model, prompt and index versions behind an answer. */
	provenance: AnswerProvenance | null;
};

export type StoredAuditEvent = AuditEvent & { id: string; createdAt: string };

export interface AuditStore {
	append(event: AuditEvent): Promise<StoredAuditEvent>;
	list(input: { ownerId: string; limit: number; action?: string }): Promise<StoredAuditEvent[]>;
}

export type AuditLogOptions = {
	store: AuditStore;
	/** Redacts personal data and secrets inside `data` (from `@synapse/security`). */
	redact: (data: Record<string, unknown>) => Record<string, unknown>;
};

/**
 * The event history. `record` redacts, then appends; there is no update or delete here (the table
 * rejects updates too). Callers await it, so an answer is only returned once it is traceable.
 */
export function createAuditLog({ store, redact }: AuditLogOptions) {
	return {
		record: (event: AuditEvent): Promise<StoredAuditEvent> =>
			store.append({ ...event, data: redact(event.data) }),
		/** Newest first. */
		list: (ownerId: string, { limit, action }: { limit: number; action?: string }) =>
			store.list({ ownerId, limit, ...(action ? { action } : {}) }),
	};
}

export type AuditLog = ReturnType<typeof createAuditLog>;
