ALTER TABLE "rag_chunks" ADD COLUMN IF NOT EXISTS "context" text;--> statement-breakpoint
-- Keyword search reads the context line with the content (text-v2); the new index exists before the old one goes.
CREATE INDEX IF NOT EXISTS "rag_chunks_search_idx" ON "rag_chunks" USING gin (to_tsvector('simple', coalesce("context", '') || ' ' || "content"));--> statement-breakpoint
DROP INDEX IF EXISTS "rag_chunks_content_search_idx";
