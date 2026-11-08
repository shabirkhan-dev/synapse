import type { AnswerProvenance } from "@synapse/core/types";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Append-only event history (`@synapse/audit`). A trigger rejects UPDATE (migration
 * `0009_audit_events_append_only`); rows are only ever inserted, and deleted by retention.
 */
export const auditEvents = pgTable(
	"audit_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id").notNull(),
		actorId: text("actor_id").notNull(),
		action: text("action").notNull(),
		subjectType: text("subject_type").notNull(),
		subjectId: text("subject_id"),
		requestId: text("request_id"),
		data: jsonb("data").$type<Record<string, unknown>>().notNull(),
		provenance: jsonb("provenance").$type<AnswerProvenance>(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("audit_events_owner_created_idx").on(table.ownerId, table.createdAt),
		index("audit_events_owner_action_idx").on(table.ownerId, table.action, table.createdAt),
		index("audit_events_request_id_idx").on(table.requestId),
	],
);

export type AuditEventRow = typeof auditEvents.$inferSelect;
