import { SynapseError } from "@synapse/core/errors";

import { OVERSIGHT_ERROR_CODES } from "../oversight-error-codes";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalRequest = {
	/** Also the id of the paused run (graph thread) waiting for this decision. */
	id: string;
	ownerId: string;
	/** What will run when approved, e.g. `rag.purge-documents`. */
	action: string;
	/** One line for the reviewer. */
	summary: string;
	status: ApprovalStatus;
	reason: string | null;
	decidedBy: string | null;
	decidedAt: string | null;
	createdAt: string;
};

export type Decision = { approved: boolean; decidedBy: string; reason?: string };

export interface ApprovalStore {
	/** Insert a pending request; an existing id is left as is (safe to repeat). */
	create(input: { id: string; ownerId: string; action: string; summary: string }): Promise<void>;
	find(input: { id: string; ownerId: string }): Promise<ApprovalRequest | null>;
	listPending(ownerId: string, limit: number): Promise<ApprovalRequest[]>;
	/** Set the decision only while pending; returns the updated request, or `null` if not pending. */
	decide(input: { id: string; ownerId: string } & Decision): Promise<ApprovalRequest | null>;
}

/**
 * Approval requests and the review queue. A decision is final: it is written once, while the
 * request is pending. Repeating the same decision returns the stored request, so a client (or a
 * failed resume) can retry safely; a different decision fails.
 */
export function createApprovals(store: ApprovalStore) {
	async function get(id: string, ownerId: string): Promise<ApprovalRequest> {
		const request = await store.find({ id, ownerId });
		if (!request) {
			throw new SynapseError(
				OVERSIGHT_ERROR_CODES.APPROVAL_NOT_FOUND,
				"Approval request not found",
			);
		}
		return request;
	}

	return {
		request: (input: { id: string; ownerId: string; action: string; summary: string }) =>
			store.create(input),
		get,
		pending: (ownerId: string, limit = 50) => store.listPending(ownerId, limit),

		async decide(id: string, ownerId: string, decision: Decision): Promise<ApprovalRequest> {
			const decided = await store.decide({ id, ownerId, ...decision });
			if (decided) {
				return decided;
			}
			const existing = await get(id, ownerId);
			const wanted: ApprovalStatus = decision.approved ? "approved" : "rejected";
			if (existing.status !== wanted) {
				throw new SynapseError(
					OVERSIGHT_ERROR_CODES.APPROVAL_ALREADY_DECIDED,
					`Approval request already ${existing.status}`,
				);
			}
			return existing;
		},
	};
}

export type Approvals = ReturnType<typeof createApprovals>;
