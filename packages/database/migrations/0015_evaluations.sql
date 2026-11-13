CREATE TABLE IF NOT EXISTS "eval_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"question" text NOT NULL,
	"expected_document_ids" uuid[] NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eval_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"created_by" text NOT NULL,
	"k" integer NOT NULL,
	"question_count" integer NOT NULL,
	"embedding_model" text NOT NULL,
	"chunker_version" text NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eval_questions_owner_created_idx" ON "eval_questions" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eval_runs_owner_created_idx" ON "eval_runs" USING btree ("owner_id","created_at");