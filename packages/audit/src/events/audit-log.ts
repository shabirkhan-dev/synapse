import type { AnswerProvenance } from "@synapse/core/types";

import { AUDIT_ACTIONS } from "./audit-actions";

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

/** Answers that share a UTC day and the models/prompt behind them, with their summed tokens. */
export type UsageGroup = {
	/** Which kind of answer: `rag.query.answered` or `chat.message.answered`. */
	action: string;
	/** `YYYY-MM-DD` (UTC). */
	day: string;
	chatModel: string;
	promptVersion: string;
	embeddingModel: string;
	answers: number;
	inputTokens: number;
	outputTokens: number;
};

export interface AuditStore {
	append(event: AuditEvent): Promise<StoredAuditEvent>;
	/** Newest first; only `actorId`'s events when given. */
	list(input: {
		ownerId: string;
		limit: number;
		action?: string;
		actorId?: string;
	}): Promise<StoredAuditEvent[]>;
	/** Events of these `actions` since `since` that carry provenance, grouped (see `UsageGroup`). */
	usage(input: {
		ownerId: string;
		actions: string[];
		since: Date;
		actorId?: string;
	}): Promise<UsageGroup[]>;
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
		list: (
			ownerId: string,
			{ limit, action, actorId }: { limit: number; action?: string; actorId?: string },
		) =>
			store.list({
				ownerId,
				limit,
				...(action ? { action } : {}),
				...(actorId ? { actorId } : {}),
			}),
		/** Answers (RAG and chat) since `since`, grouped by kind, UTC day and the models behind them. */
		usage: (ownerId: string, { since, actorId }: { since: Date; actorId?: string }) =>
			store.usage({
				ownerId,
				actions: [AUDIT_ACTIONS.RAG_QUERY_ANSWERED, AUDIT_ACTIONS.CHAT_MESSAGE_ANSWERED],
				since,
				...(actorId ? { actorId } : {}),
			}),
	};
}

export type AuditLog = ReturnType<typeof createAuditLog>;
