CREATE TABLE "job_checkpoints" (
	"job_id" text PRIMARY KEY NOT NULL,
	"queue" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
