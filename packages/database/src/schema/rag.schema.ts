import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	vector,
} from "drizzle-orm/pg-core";

import { users } from "./auth.schema";

/** Who may read a document inside its organization (ADR-0008). */
export const DOCUMENT_ACCESS = ["organization", "restricted"] as const;
export type DocumentAccess = (typeof DOCUMENT_ACCESS)[number];

/**
 * Text-search configuration for keyword search. `simple` = lowercase + split, no stemming, so it
 * works for any language and exact terms (SKUs, names). Changing it needs a new index migration.
 */
export const TEXT_SEARCH_CONFIG = "simple";

/**
 * `to_tsvector('<config>', column)` — the exact expression the GIN index is built on. Queries must
 * use this helper (with the literal config, not a bind parameter) or Postgres will not use the index.
 */
export function searchVector(column: AnyColumn | SQL): SQL {
	return sql`to_tsvector(${sql.raw(`'${TEXT_SEARCH_CONFIG}'`)}, ${column})`;
}

/**
 * What keyword search reads for a chunk: its context line (`Title › headings`, null before
 * text-v2) and its content. The GIN index is built on `searchVector` of exactly this expression.
 */
export function chunkSearchText(chunk: { context: AnyColumn; content: AnyColumn }): SQL {
	return sql`coalesce(${chunk.context}, '') || ' ' || ${chunk.content}`;
}

/**
 * Keyword query that matches chunks containing **any** term (ranked by `ts_rank_cd`), because
 * natural questions rarely contain every word of the answer. Common words are dropped from the
 * query (the `simple` index keeps them, so they would match everything). Quoted phrases stay
 * phrases and `-term` / `-"phrase"` still exclude.
 */
export function searchQuery(input: string): SQL {
	const { include, exclude } = splitSearchTerms(input);
	const anyIncluded = websearchQuery(include.join(" or "));
	if (exclude.length === 0) {
		return anyIncluded;
	}
	return sql`(${anyIncluded} && !!${websearchQuery(exclude.join(" or "))})`;
}

export interface SearchTerms {
	/** Words and quoted phrases (quotes kept), any of which may match. */
	include: string[];
	/** Excluded words and phrases, without the leading `-`. */
	exclude: string[];
}

const SEARCH_TERM = /(-?)("[^"]*"?|\S+)/g;

const HAS_WORD = /[\p{L}\p{N}]/u;

/**
 * English function words dropped from keyword queries. Query-side only, so exact lookups still work
 * when a query has nothing else (`"to be"`, or a query of only stopwords).
 */
const SEARCH_STOPWORDS = new Set(
	(
		"a an and any are as at be been but by can cannot could did do does for from get got had has " +
		"have how i if in into is it its me my no not of on or our so than that the their them then " +
		"there these they this those to too us was we were what when where which who why will with " +
		"would you your"
	).split(" "),
);

/** Split search-box input into included and excluded terms; a bare `or` and punctuation are dropped. */
export function splitSearchTerms(input: string): SearchTerms {
	const terms: SearchTerms = { include: [], exclude: [] };
	for (const [, minus, term = ""] of input.matchAll(SEARCH_TERM)) {
		if (term.toLowerCase() === "or" || !HAS_WORD.test(term)) {
			continue;
		}
		(minus ? terms.exclude : terms.include).push(term);
	}
	const meaningful = terms.include.filter((term) => !SEARCH_STOPWORDS.has(term.toLowerCase()));
	if (meaningful.length > 0) {
		terms.include = meaningful;
	}
	return terms;
}

function websearchQuery(input: string): SQL {
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
		/**
		 * `organization`: every member reads it. `restricted`: its creator, the users in
		 * `rag_document_members`, and the organization's owners and admins (ADR-0008).
		 */
		access: text("access").$type<DocumentAccess>().notNull().default("organization"),
		/** Who added it; null for documents added before ADR-0008 or whose user was deleted. */
		createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index("rag_documents_owner_id_idx").on(table.ownerId, table.createdAt),
		uniqueIndex("rag_documents_owner_content_hash_unique").on(table.ownerId, table.contentHash),
		check("rag_documents_access_check", sql`${table.access} in ('organization', 'restricted')`),
	],
);

/** Users a restricted document is shared with (besides its creator, owners and admins). */
export const ragDocumentMembers = pgTable(
	"rag_document_members",
	{
		documentId: uuid("document_id")
			.notNull()
			.references(() => ragDocuments.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ name: "rag_document_members_pk", columns: [table.documentId, table.userId] }),
		index("rag_document_members_user_idx").on(table.userId),
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
		/** `Document title › headings` (text-v2); embedded and keyword-indexed with the content. */
		context: text("context"),
		embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
		/** Chunker that produced this chunk (`@synapse/knowledge`, e.g. `text-v2;size=1000;overlap=150`). */
		chunkerVersion: text("chunker_version"),
		/** Embedding model that produced the vector (e.g. `openrouter:openai/text-embedding-3-small`). */
		embeddingModel: text("embedding_model"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("rag_chunks_document_chunk_unique").on(table.documentId, table.chunkIndex),
		index("rag_chunks_owner_id_idx").on(table.ownerId),
		index("rag_chunks_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
		index("rag_chunks_search_idx").using("gin", searchVector(chunkSearchText(table))),
	],
);

export type RagDocumentRow = typeof ragDocuments.$inferSelect;
export type RagChunkRow = typeof ragChunks.$inferSelect;
