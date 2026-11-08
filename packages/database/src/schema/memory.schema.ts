import {
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	vector,
} from "drizzle-orm/pg-core";

import { EMBEDDING_DIMENSIONS } from "./rag.schema";

export const chatConversations = pgTable(
	"chat_conversations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id").notNull(),
		/** First words of the first user message. */
		title: text("title").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index("chat_conversations_owner_updated_idx").on(table.ownerId, table.updatedAt)],
);

/** UI messages as the chat client sent or received them; `id` is the client's message id. */
export const chatMessages = pgTable(
	"chat_messages",
	{
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => chatConversations.id, { onDelete: "cascade" }),
		id: text("id").notNull(),
		ownerId: text("owner_id").notNull(),
		role: text("role").notNull(),
		message: jsonb("message").$type<Record<string, unknown>>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ name: "chat_messages_pk", columns: [table.conversationId, table.id] }),
		index("chat_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
	],
);

/**
 * Long-term facts the user asked to remember. Searched exactly per owner (few rows each), so no
 * vector index; add HNSW only if owners grow to many thousands of facts.
 */
export const memoryFacts = pgTable(
	"memory_facts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id").notNull(),
		content: text("content").notNull(),
		embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
		embeddingModel: text("embedding_model").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("memory_facts_owner_content_unique").on(table.ownerId, table.content),
		index("memory_facts_owner_created_idx").on(table.ownerId, table.createdAt),
	],
);

export type ChatConversationRow = typeof chatConversations.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type MemoryFactRow = typeof memoryFacts.$inferSelect;
