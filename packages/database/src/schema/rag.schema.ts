import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	vector,
} from "drizzle-orm/pg-core";

/**
 * Text-search configuration for keyword search. `simple` = lowercase + split, no stemming, so it
 * works for any language and exact terms (SKUs, names). Changing it needs a new index migration.
 */
export const TEXT_SEARCH_CONFIG = "simple";

/**
 * `to_tsvector('<config>', column)` — the exact expression the GIN index is built on. Queries must
 * use this helper (with the literal config, not a bind parameter) or Postgres will not use the index.
 */
export function searchVector(column: AnyColumn): SQL {
	return sql`to_tsvector(${sql.raw(`'${TEXT_SEARCH_CONFIG}'`)}, ${column})`;
}

/** `websearch_to_tsquery('<config>', input)`: quotes, OR and -exclusions like a search box. */
export function searchQuery(input: string): SQL {
	return sql`websearch_to_tsquery(${sql.raw(`'${TEXT_SEARCH_CONFIG}'`)}, ${input})`;
}

/**
 * Must match the embedding model output. 1536 = OpenAI text-embedding-3-small (the default
 * AI_EMBEDDING_MODEL). Changing it needs a new migration and a re-ingest.
 */
export const EMBEDDING_DIMENSIONS = 1536;

export const ragDocuments = pgTable(
	"rag_documents",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** User id (JWT `sub`). Every query is scoped to it. */
		ownerId: text("owner_id").notNull(),
		title: text("title").notNull(),
		source: text("source"),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
		chunkCount: integer("chunk_count").notNull().default(0),
		/** SHA-256 of the normalized content (`@synapse/ingestion`). Null for rows ingested before dedup. */
		contentHash: text("content_hash"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("rag_documents_owner_id_idx").on(table.ownerId, table.createdAt),
		uniqueIndex("rag_documents_owner_content_hash_unique").on(table.ownerId, table.contentHash),
	],
);

export const ragChunks = pgTable(
	"rag_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => ragDocuments.id, { onDelete: "cascade" }),
		ownerId: text("owner_id").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		content: text("content").notNull(),
		embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
		/** Chunker that produced this chunk (`@synapse/knowledge`, e.g. `text-v1;size=1000;overlap=150`). */
		chunkerVersion: text("chunker_version"),
		/** Embedding model that produced the vector (e.g. `openrouter:openai/text-embedding-3-small`). */
		embeddingModel: text("embedding_model"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("rag_chunks_document_chunk_unique").on(table.documentId, table.chunkIndex),
		index("rag_chunks_owner_id_idx").on(table.ownerId),
		index("rag_chunks_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
		index("rag_chunks_content_search_idx").using("gin", searchVector(table.content)),
	],
);

export type RagDocumentRow = typeof ragDocuments.$inferSelect;
export type RagChunkRow = typeof ragChunks.$inferSelect;
