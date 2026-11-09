import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Actions waiting for a person. The id is also the paused graph run's thread id. */
export const approvalRequests = pgTable(
	"approval_requests",
	{
		id: uuid("id").primaryKey(),
		ownerId: text("owner_id").notNull(),
		/** e.g. `rag.purge-documents`. */
		action: text("action").notNull(),
		summary: text("summary").notNull(),
		/** User who asked (the organization's admins decide). `null` on rows from before roles. */
		requestedBy: text("requested_by"),
		/** `pending`, `approved` or `rejected`; a decision is written once. */
		status: text("status").notNull().default("pending"),
		reason: text("reason"),
		decidedBy: text("decided_by"),
		decidedAt: timestamp("decided_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("approval_requests_owner_status_idx").on(table.ownerId, table.status, table.createdAt),
	],
);

/** Thumbs up/down per answered query (`request_id` = the query's `x-request-id`). */
export const answerFeedback = pgTable(
	"answer_feedback",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id").notNull(),
		requestId: text("request_id").notNull(),
		/** `up` or `down`. */
		rating: text("rating").notNull(),
		comment: text("comment"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("answer_feedback_owner_request_unique").on(table.ownerId, table.requestId),
	],
);

export type ApprovalRequestRow = typeof approvalRequests.$inferSelect;
export type AnswerFeedbackRow = typeof answerFeedback.$inferSelect;
