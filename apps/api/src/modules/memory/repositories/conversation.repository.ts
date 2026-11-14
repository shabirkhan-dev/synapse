import { and, asc, desc, eq, sql } from "drizzle-orm";

import { chatConversations, chatMessages, type Database } from "@synapse/database";
import type { StoredMessage } from "@synapse/memory";

import { toConversation, toStoredMessage } from "../mappers/memory.mapper";
import type { Conversation, ConversationStore, NewMessage } from "../types/memory.types";

export class DrizzleConversationRepository implements ConversationStore {
	constructor(private readonly db: Database) {}

	async create(ownerId: string, title: string): Promise<Conversation> {
		const [row] = await this.db.insert(chatConversations).values({ ownerId, title }).returning();
		if (!row) {
			throw new Error("Failed to insert conversation");
		}
		return toConversation(row);
	}

	async find(ownerId: string, id: string): Promise<Conversation | null> {
		const [row] = await this.db
			.select()
			.from(chatConversations)
			.where(and(eq(chatConversations.id, id), eq(chatConversations.ownerId, ownerId)))
			.limit(1);
		return row ? toConversation(row) : null;
	}

	async list(ownerId: string, limit: number): Promise<Conversation[]> {
		const rows = await this.db
			.select()
			.from(chatConversations)
			.where(eq(chatConversations.ownerId, ownerId))
			.orderBy(desc(chatConversations.updatedAt))
			.limit(limit);
		return rows.map(toConversation);
	}

	/** Oldest first. The conversation must already be known to belong to `ownerId`. */
	async messages(
		ownerId: string,
		conversationId: string,
		{ latest }: { latest?: number } = {},
	): Promise<Array<StoredMessage<Record<string, unknown>>>> {
		const query = this.db
			.select()
			.from(chatMessages)
			.where(
				and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.ownerId, ownerId)),
			)
			// Insertion order: messages stored in one insert share `created_at`.
			.orderBy(latest === undefined ? asc(chatMessages.ordinal) : desc(chatMessages.ordinal));
		const rows = latest === undefined ? await query : (await query.limit(latest)).toReversed();
		return rows.map(toStoredMessage);
	}

	/**
	 * Append messages in order; ids already stored are skipped (a client may resend history).
	 * Timestamps are spaced by 1 ms so messages written together keep their order.
	 */
	async append(ownerId: string, conversationId: string, messages: NewMessage[]): Promise<void> {
		if (messages.length === 0) {
			return;
		}
		const base = Date.now();
		await this.db.transaction(async (tx) => {
			await tx
				.insert(chatMessages)
				.values(
					messages.map((message, index) => ({
						...message,
						conversationId,
						ownerId,
						createdAt: new Date(base + index),
					})),
				)
				.onConflictDoNothing({ target: [chatMessages.conversationId, chatMessages.id] });
			await tx
				.update(chatConversations)
				.set({ updatedAt: sql`now()` })
				.where(
					and(eq(chatConversations.id, conversationId), eq(chatConversations.ownerId, ownerId)),
				);
		});
	}

	async remove(ownerId: string, id: string): Promise<boolean> {
		const rows = await this.db
			.delete(chatConversations)
			.where(and(eq(chatConversations.id, id), eq(chatConversations.ownerId, ownerId)))
			.returning({ id: chatConversations.id });
		return rows.length > 0;
	}

	async removeAll(ownerId: string): Promise<number> {
		const rows = await this.db
			.delete(chatConversations)
			.where(eq(chatConversations.ownerId, ownerId))
			.returning({ id: chatConversations.id });
		return rows.length;
	}
}
