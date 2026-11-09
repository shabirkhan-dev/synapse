import { and, desc, eq, sql } from "drizzle-orm";

import { answerFeedback, approvalRequests, type Database } from "@synapse/database";
import type {
	AnswerFeedback,
	ApprovalRequest,
	ApprovalStore,
	Decision,
	FeedbackRating,
	FeedbackStore,
} from "@synapse/human-oversight";

import { toAnswerFeedback, toApprovalRequest } from "../mappers/oversight.mapper";

export class DrizzleApprovalRepository implements ApprovalStore {
	constructor(private readonly db: Database) {}

	async create(input: {
		id: string;
		ownerId: string;
		action: string;
		summary: string;
	}): Promise<void> {
		await this.db
			.insert(approvalRequests)
			.values(input)
			.onConflictDoNothing({ target: approvalRequests.id });
	}

	async find({ id, ownerId }: { id: string; ownerId: string }): Promise<ApprovalRequest | null> {
		const [row] = await this.db
			.select()
			.from(approvalRequests)
			.where(and(eq(approvalRequests.id, id), eq(approvalRequests.ownerId, ownerId)))
			.limit(1);
		return row ? toApprovalRequest(row) : null;
	}

	async listPending(
		ownerId: string,
		limit: number,
		requestedBy?: string,
	): Promise<ApprovalRequest[]> {
		const rows = await this.db
			.select()
			.from(approvalRequests)
			.where(
				and(
					eq(approvalRequests.ownerId, ownerId),
					eq(approvalRequests.status, "pending"),
					requestedBy ? eq(approvalRequests.requestedBy, requestedBy) : undefined,
				),
			)
			.orderBy(desc(approvalRequests.createdAt))
			.limit(limit);
		return rows.map(toApprovalRequest);
	}

	async decide({
		id,
		ownerId,
		approved,
		decidedBy,
		reason,
	}: { id: string; ownerId: string } & Decision): Promise<ApprovalRequest | null> {
		const [row] = await this.db
			.update(approvalRequests)
			.set({
				status: approved ? "approved" : "rejected",
				decidedBy,
				reason: reason ?? null,
				decidedAt: sql`now()`,
				updatedAt: sql`now()`,
			})
			.where(
				and(
					eq(approvalRequests.id, id),
					eq(approvalRequests.ownerId, ownerId),
					eq(approvalRequests.status, "pending"),
				),
			)
			.returning();
		return row ? toApprovalRequest(row) : null;
	}
}

export class DrizzleFeedbackRepository implements FeedbackStore {
	constructor(private readonly db: Database) {}

	async upsert(input: {
		ownerId: string;
		requestId: string;
		rating: FeedbackRating;
		comment: string | null;
	}): Promise<AnswerFeedback> {
		const [row] = await this.db
			.insert(answerFeedback)
			.values(input)
			.onConflictDoUpdate({
				target: [answerFeedback.ownerId, answerFeedback.requestId],
				set: { rating: input.rating, comment: input.comment, updatedAt: sql`now()` },
			})
			.returning();
		if (!row) {
			throw new Error("Feedback upsert returned no row");
		}
		return toAnswerFeedback(row);
	}
}
