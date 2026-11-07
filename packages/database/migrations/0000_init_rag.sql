-- pgvector must exist before the vector(1536) column. Needs a Postgres image with the extension
-- available (docker compose: pgvector/pgvector:pg18; Neon: supported out of the box).
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "rag_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"source" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_document_id_rag_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."rag_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rag_chunks_document_chunk_unique" ON "rag_chunks" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "rag_chunks_owner_id_idx" ON "rag_chunks" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "rag_chunks_embedding_hnsw_idx" ON "rag_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "rag_documents_owner_id_idx" ON "rag_documents" USING btree ("owner_id","created_at");