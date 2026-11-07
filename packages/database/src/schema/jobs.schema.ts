import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Saved progress of a long job, keyed by queue job id, so a retry resumes instead of restarting. */
export const jobCheckpoints = pgTable("job_checkpoints", {
	jobId: text("job_id").primaryKey(),
	queue: text("queue").notNull(),
	state: jsonb("state").$type<Record<string, unknown>>().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
