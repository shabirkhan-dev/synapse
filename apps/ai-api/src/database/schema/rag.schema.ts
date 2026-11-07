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
 * Must match the embedding model output. 1536 = OpenAI text-embedding-3-small (the default
 * AI_EMBEDDING_MODEL). Changing it needs a new migration and a re-ingest.
 */
export const EMBEDDING_DIMENSIONS = 1536;

export const ragDocuments = pgTable(
	"rag_documents",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** nest-api user id (JWT `sub`). Every query is scoped to it. */
		ownerId: text("owner_id").notNull(),
		title: text("title").notNull(),
		source: text("source"),
		metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
		chunkCount: integer("chunk_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("rag_documents_owner_id_idx").on(table.ownerId, table.createdAt)],
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
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("rag_chunks_document_chunk_unique").on(table.documentId, table.chunkIndex),
		index("rag_chunks_owner_id_idx").on(table.ownerId),
		index("rag_chunks_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	],
);

export type RagDocumentRow = typeof ragDocuments.$inferSelect;
export type RagChunkRow = typeof ragChunks.$inferSelect;
