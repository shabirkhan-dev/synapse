ALTER TABLE "approval_requests" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;--> statement-breakpoint
-- Requests waiting from before expiry get the default 72 hours from when they were made.
UPDATE "approval_requests" SET "expires_at" = "created_at" + interval '72 hours' WHERE "status" = 'pending' AND "expires_at" IS NULL;
