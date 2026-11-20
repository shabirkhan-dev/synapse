-- ADR-0008: documents are readable by the whole organization (default, as before) or restricted.
CREATE TABLE IF NOT EXISTS "rag_document_members" (
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rag_document_members_pk" PRIMARY KEY("document_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "rag_documents" ADD COLUMN IF NOT EXISTS "access" text DEFAULT 'organization' NOT NULL;--> statement-breakpoint
ALTER TABLE "rag_documents" ADD COLUMN IF NOT EXISTS "created_by" uuid;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "rag_document_members" ADD CONSTRAINT "rag_document_members_document_id_rag_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "rag_document_members" ADD CONSTRAINT "rag_document_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rag_document_members_user_idx" ON "rag_document_members" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "rag_documents" ADD CONSTRAINT "rag_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "rag_documents" ADD CONSTRAINT "rag_documents_access_check" CHECK ("rag_documents"."access" in ('organization', 'restricted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
