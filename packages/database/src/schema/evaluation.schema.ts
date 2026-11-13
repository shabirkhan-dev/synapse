import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** A question a team expects its documents to answer, and which documents should. */
export const evalQuestions = pgTable(
	"eval_questions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id").notNull(),
		question: text("question").notNull(),
		/** `rag_documents.id`s; a deleted document simply stops being found. */
		expectedDocumentIds: uuid("expected_document_ids").array().notNull(),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("eval_questions_owner_created_idx").on(table.ownerId, table.createdAt)],
);

export type EvalSearchMode = "hybrid" | "vector" | "keyword";

export type EvalRunResults = {
	modes: Record<EvalSearchMode, { recallAtK: number; mrr: number }>;
	cases: Array<{
		questionId: string;
		question: string;
		expectedDocumentIds: string[];
		/** 1-based rank of the first expected document per mode, null when not retrieved. */
		ranks: Record<EvalSearchMode, number | null>;
	}>;
};

/** One run of every question through each search mode, with the versions it ran on. */
export const evalRuns = pgTable(
	"eval_runs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id").notNull(),
		createdBy: text("created_by").notNull(),
		k: integer("k").notNull(),
		questionCount: integer("question_count").notNull(),
		embeddingModel: text("embedding_model").notNull(),
		chunkerVersion: text("chunker_version").notNull(),
		results: jsonb("results").$type<EvalRunResults>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("eval_runs_owner_created_idx").on(table.ownerId, table.createdAt)],
);

export type EvalQuestionRow = typeof evalQuestions.$inferSelect;
export type EvalRunRow = typeof evalRuns.$inferSelect;
