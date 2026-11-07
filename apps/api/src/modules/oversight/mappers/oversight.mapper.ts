import type { AnswerFeedbackRow, ApprovalRequestRow } from "@synapse/database";
import type {
	AnswerFeedback,
	ApprovalRequest,
	ApprovalStatus,
	FeedbackRating,
} from "@synapse/human-oversight";

export function toApprovalRequest(row: ApprovalRequestRow): ApprovalRequest {
	return {
		id: row.id,
		ownerId: row.ownerId,
		action: row.action,
		summary: row.summary,
		status: row.status as ApprovalStatus,
		reason: row.reason,
		decidedBy: row.decidedBy,
		decidedAt: row.decidedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	};
}

export function toAnswerFeedback(row: AnswerFeedbackRow): AnswerFeedback {
	return {
		ownerId: row.ownerId,
		requestId: row.requestId,
		rating: row.rating as FeedbackRating,
		comment: row.comment,
		createdAt: row.createdAt.toISOString(),
	};
}
